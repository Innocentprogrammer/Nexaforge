from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from datetime import timedelta

from admin_portal.activity import Action, log_activity, recently_logged

from .models import Invitation
from .serializers import InvitationSerializer, PublicInvitationSerializer


class InvitationViewSet(viewsets.ModelViewSet):
    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "event_type"]

    def get_queryset(self):
        return Invitation.objects.filter(user=self.request.user, deleted_at__isnull=True)

    def perform_create(self, serializer):
        invitation = serializer.save(user=self.request.user)
        log_activity(
            Action.INVITATION_CREATED, request=self.request, target=invitation,
            summary=f"Created invitation “{invitation.title}”",
        )

    def perform_update(self, serializer):
        invitation = serializer.save()
        # The editor autosaves every 30s; one row per 10-minute editing session.
        if not recently_logged(
            Action.INVITATION_UPDATED, actor=self.request.user,
            target_id=str(invitation.pk), within=timedelta(minutes=10),
        ):
            log_activity(
                Action.INVITATION_UPDATED, request=self.request, target=invitation,
                summary=f"Edited invitation “{invitation.title}”",
                metadata={"fields": sorted(serializer.validated_data.keys())},
            )

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])
        log_activity(
            Action.INVITATION_DELETED, request=self.request, target=instance,
            summary=f"Deleted invitation “{instance.title}”",
        )

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        invitation = self.get_object()
        was_published = invitation.status == Invitation.Status.PUBLISHED
        invitation.status = Invitation.Status.PUBLISHED
        invitation.qr_code = f"/i/{invitation.slug}"
        invitation.save(update_fields=["status", "qr_code", "updated_at"])
        if not was_published:
            log_activity(
                Action.INVITATION_PUBLISHED, request=request, target=invitation,
                summary=f"Published invitation “{invitation.title}”",
            )
            from notifications.services import create_notification

            create_notification(
                user=request.user,
                category="INVITATION",
                title="Your invitation is published",
                message=f'“{invitation.title}” is now published and ready to share with your guests.',
                action_url=f"/invitations/{invitation.pk}/edit",
                metadata={"invitation_id": str(invitation.pk), "event": "PUBLISHED"},
            )
        return Response({"success": True, "data": InvitationSerializer(invitation).data})

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        """GET /invitations/{id}/pdf/ — the generic invitation PDF.

        Available on **every** tier, including Normal, and carries no guest
        personalisation. Gold/Diamond hosts additionally get a per-guest
        personalised PDF at /guests/{id}/pdf/ (see guests.views.GuestViewSet.pdf),
        which is the same renderer with a name passed in.
        """
        from .pdf import pdf_filename, render_invitation_pdf

        invitation = self.get_object()
        pdf_bytes = render_invitation_pdf(invitation)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{pdf_filename(invitation)}"'
        return response

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        original = self.get_object()
        copy = Invitation.objects.create(
            user=request.user,
            template=original.template,
            title=f"{original.title} (Copy)",
            event_type=original.event_type,
            event_date=original.event_date,
            venue=original.venue,
            invitation_json=original.invitation_json,
            status=Invitation.Status.DRAFT,
        )
        log_activity(
            Action.INVITATION_DUPLICATED, request=request, target=copy,
            summary=f"Duplicated “{original.title}”",
            metadata={"source_invitation_id": str(original.pk)},
        )
        return Response(
            {"success": True, "data": InvitationSerializer(copy).data}, status=status.HTTP_201_CREATED
        )


class PublicInvitationView(APIView):
    """No-auth public invitation page lookup by slug, per API Specification.MD."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        invitation = get_object_or_404(
            Invitation, slug=slug, status=Invitation.Status.PUBLISHED, deleted_at__isnull=True
        )
        return Response({"success": True, "data": PublicInvitationSerializer(invitation).data})
