from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Invitation
from .serializers import InvitationSerializer, PublicInvitationSerializer


class InvitationViewSet(viewsets.ModelViewSet):
    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "event_type"]

    def get_queryset(self):
        return Invitation.objects.filter(user=self.request.user, deleted_at__isnull=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["deleted_at"])

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        invitation = self.get_object()
        invitation.status = Invitation.Status.PUBLISHED
        invitation.qr_code = f"/i/{invitation.slug}"
        invitation.save(update_fields=["status", "qr_code", "updated_at"])
        return Response({"success": True, "data": InvitationSerializer(invitation).data})

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
