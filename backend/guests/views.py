import csv

from django.db.models import Prefetch
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from invitations.models import Invitation
from invitations.pdf import pdf_filename, render_invitation_pdf
from invitations.views import PublicInvitationView

from .importer import import_guests_from_csv
from .models import Guest, InviteSendLog
from .permissions import CanImportGuests, CanSendInvites, CanUsePerGuestLinks
from .serializers import GuestSendStatusSerializer, GuestSerializer
from .tasks import send_diamond_invites


class OwnedInvitationMixin:
    def _get_invitation(self, request, invitation_id):
        return get_object_or_404(Invitation, id=invitation_id, user=request.user)


class InvitationGuestListView(OwnedInvitationMixin, APIView):
    """GET/POST /invitations/{invitation_id}/guests/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, invitation_id):
        invitation = self._get_invitation(request, invitation_id)
        guests = invitation.guests.select_related("rsvp").all()
        return Response({"success": True, "data": GuestSerializer(guests, many=True).data})

    def post(self, request, invitation_id):
        invitation = self._get_invitation(request, invitation_id)
        serializer = GuestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        guest = serializer.save(invitation=invitation)
        return Response(
            {"success": True, "data": GuestSerializer(guest).data}, status=status.HTTP_201_CREATED
        )


class GuestImportView(APIView):
    """POST /guests/import/ — multipart CSV upload.

    Columns: full_name, email, phone_number, group_name (`phone` still accepted
    as an alias for `phone_number`). There is no `tier` column any more — tier is
    the host's plan, so it is read from ``request.user.subscription_tier``.

    Gated by :class:`~guests.permissions.CanImportGuests`: a NORMAL host gets a
    403 explaining why rather than a 200 that imported nothing.

    **A DIAMOND host's import sends immediately** — normalise, validate,
    de-duplicate, enqueue. There is deliberately no confirmation step, so the
    response carries the full summary (what was sent, what collapsed onto an
    earlier duplicate, what was rejected for format) as the host's only record of
    a mistaken upload.
    """

    permission_classes = [permissions.IsAuthenticated, CanImportGuests]

    def post(self, request):
        invitation_id = request.data.get("invitation_id")
        invitation = get_object_or_404(Invitation, id=invitation_id, user=request.user)
        file = request.FILES.get("file")
        if not file:
            return Response({"success": False, "message": "No file uploaded."}, status=400)

        auto_send = request.user.is_diamond
        summary = import_guests_from_csv(invitation, file, build_send_batch=auto_send)

        task_id = None
        if auto_send and summary.send_batch_ids:
            # Only the ids that passed the format check and survived phone
            # de-duplication — a rejected or collapsed row is never handed to the
            # task, so it produces no InviteSendLog row at all.
            task_id = send_diamond_invites.delay(
                str(invitation.id), summary.send_batch_ids
            ).id

        payload = summary.as_payload()
        payload["auto_send"] = auto_send
        payload["task_id"] = task_id
        return Response(
            {
                "success": True,
                "message": _import_message(summary, auto_send),
                "data": GuestSerializer(summary.guests, many=True).data,
                "meta": payload,
            },
            status=status.HTTP_201_CREATED,
        )


def _import_message(summary, auto_send: bool) -> str:
    parts = [f"Imported {len(summary.guests)} guest(s)."]
    if auto_send:
        parts.append(f"Invites sent automatically to {len(summary.send_batch_ids)}.")
        if summary.duplicates:
            parts.append(f"{len(summary.duplicates)} duplicate number(s) collapsed.")
        if summary.invalid_numbers:
            parts.append(f"{len(summary.invalid_numbers)} not sent — invalid number format.")
    return " ".join(parts)


class InviteLinksExportView(OwnedInvitationMixin, APIView):
    """POST /invitations/{id}/guests/export-links/

    CSV (the counterpart of the CSV that /guests/import/ consumes) of every
    guest's personal invitation link. No tier filter on the guests: tier is a
    property of the host, enforced by the permission class, so if this host can
    export at all then all of their guests are exportable.
    """

    permission_classes = [permissions.IsAuthenticated, CanUsePerGuestLinks]

    def post(self, request, invitation_id):
        invitation = self._get_invitation(request, invitation_id)
        guests = invitation.guests.order_by("full_name")
        if not guests.exists():
            return Response(
                {
                    "success": False,
                    "message": "This invitation has no guests to export.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="{invitation.slug}-invite-links.csv"'
        )
        writer = csv.writer(response)
        writer.writerow(["name", "email", "unique_invite_url"])
        for guest in guests:
            writer.writerow([guest.full_name, guest.email, guest.unique_invite_url])
        return response


class SendDiamondInvitesView(OwnedInvitationMixin, APIView):
    """POST /invitations/{id}/guests/send-diamond-invites/ — enqueue the task.

    The Diamond import already sends on upload; this is the explicit re-send for
    the whole guest list (e.g. after fixing a number by hand), and is what the
    dashboard's "Resend to all guests" button calls.
    """

    permission_classes = [permissions.IsAuthenticated, CanSendInvites]

    def post(self, request, invitation_id):
        invitation = self._get_invitation(request, invitation_id)
        count = invitation.guests.count()
        if not count:
            return Response(
                {
                    "success": False,
                    "message": "This invitation has no guests to send to.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = send_diamond_invites.delay(str(invitation.id))
        return Response(
            {
                "success": True,
                "message": f"Queued invites for {count} guest(s).",
                "data": {"task_id": result.id, "queued": count},
            },
            status=status.HTTP_202_ACCEPTED,
        )


class SendStatusView(OwnedInvitationMixin, APIView):
    """GET /invitations/{id}/guests/send-status/ — per-guest channel + status.

    Only reports guests that have at least one delivery attempt: a guest the
    import excluded (bad format, or collapsed onto a duplicate) was never handed
    to the task and has no log row, so listing it here as "pending" for ever
    would misrepresent what happened.
    """

    permission_classes = [permissions.IsAuthenticated, CanSendInvites]

    def get(self, request, invitation_id):
        invitation = self._get_invitation(request, invitation_id)
        guests = (
            invitation.guests.filter(send_logs__isnull=False)
            .distinct()
            .prefetch_related(
                # send_logs is ordered -created_at, so index 0 is the latest attempt.
                Prefetch("send_logs", queryset=InviteSendLog.objects.all())
            )
            .order_by("full_name")
        )
        data = GuestSendStatusSerializer(guests, many=True).data
        counts = {"total": len(data), "pending": 0, "sent": 0, "failed": 0}
        for row in data:
            key = row["status"].lower()
            if key in counts:
                counts[key] += 1
        return Response(
            {
                "success": True,
                "data": data,
                "meta": {**counts, "in_flight": counts["pending"] > 0},
            }
        )


class PublicInviteTokenView(PublicInvitationView):
    """GET /public/invite/{token}/

    Same payload and same published/soft-delete rules as
    /public/invitations/{slug}/ — this subclasses that view rather than
    reimplementing it — resolved through a guest's unique token, and records the
    open so a later RSVP can be attributed to that guest.

    ``host_tier`` is included so the page knows whether to greet the guest by
    name: that treatment belongs to Gold and Diamond hosts. It is *only* on this
    token route — /i/{slug} has no guest context and must stay anonymous.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        guest = get_object_or_404(
            Guest.objects.select_related("invitation__user"), unique_token=token
        )
        response = super().get(request, slug=guest.invitation.slug)

        if guest.invite_opened_at is None:
            Guest.objects.filter(pk=guest.pk).update(invite_opened_at=timezone.now())

        response.data["data"]["guest"] = {
            "id": str(guest.id),
            "full_name": guest.full_name,
        }
        response.data["data"]["host_tier"] = guest.invitation.user.subscription_tier
        return response


class GuestViewSet(viewsets.ModelViewSet):
    """PATCH/DELETE /guests/{id}/, GET /guests/{id}/pdf/"""

    serializer_class = GuestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        return Guest.objects.filter(invitation__user=self.request.user).select_related("rsvp")

    @action(
        detail=True,
        methods=["get"],
        url_path="pdf",
        permission_classes=[permissions.IsAuthenticated, CanUsePerGuestLinks],
    )
    def pdf(self, request, pk=None):
        """The guest's personalised PDF — Gold and Diamond.

        Same renderer as /invitations/{id}/pdf/, with the guest's name passed in;
        that adds the "Hi {name}" cover page, matching the greeting on the
        guest's /invite/{token} page. Rendered on demand rather than stored at
        import time so it can never be stale relative to the invitation the guest
        actually sees.
        """
        guest = self.get_object()
        invitation = guest.invitation
        pdf_bytes = render_invitation_pdf(invitation, guest_name=guest.full_name)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="{pdf_filename(invitation, guest.full_name)}"'
        )
        return response
