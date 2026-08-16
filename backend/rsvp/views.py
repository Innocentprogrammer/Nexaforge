from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from invitations.models import Invitation

from .models import RSVP
from .serializers import RSVPSerializer, RSVPSubmitSerializer


class RSVPSubmitView(APIView):
    """POST /rsvp/ - public, no auth required."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RSVPSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rsvp = serializer.save()
        return Response(
            {"success": True, "message": "RSVP recorded.", "data": RSVPSerializer(rsvp).data},
            status=status.HTTP_201_CREATED,
        )


class InvitationRSVPListView(APIView):
    """GET /invitations/{id}/rsvp/ - owner-only list + summary."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, invitation_id):
        invitation = get_object_or_404(Invitation, id=invitation_id, user=request.user)
        rsvps = RSVP.objects.filter(invitation=invitation).select_related("guest")
        total_guests = invitation.guests.count()
        summary = {
            "total_guests": total_guests,
            "responded": rsvps.count(),
            "accepted": rsvps.filter(response=RSVP.Response.ACCEPTED).count(),
            "declined": rsvps.filter(response=RSVP.Response.DECLINED).count(),
            "maybe": rsvps.filter(response=RSVP.Response.MAYBE).count(),
            "pending": total_guests - rsvps.count(),
            "expected_attendance": sum(
                r.guest_count for r in rsvps.filter(response=RSVP.Response.ACCEPTED)
            ),
        }
        return Response(
            {
                "success": True,
                "data": RSVPSerializer(rsvps, many=True).data,
                "meta": summary,
            }
        )
