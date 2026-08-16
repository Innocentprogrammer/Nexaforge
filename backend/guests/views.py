import csv
import io

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from invitations.models import Invitation

from .models import Guest
from .serializers import GuestSerializer


class InvitationGuestListView(APIView):
    """GET/POST /invitations/{invitation_id}/guests/"""

    permission_classes = [permissions.IsAuthenticated]

    def _get_invitation(self, request, invitation_id):
        return get_object_or_404(Invitation, id=invitation_id, user=request.user)

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
    """POST /guests/import/ - multipart CSV upload with columns: full_name,email,phone,group_name"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        invitation_id = request.data.get("invitation_id")
        invitation = get_object_or_404(Invitation, id=invitation_id, user=request.user)
        file = request.FILES.get("file")
        if not file:
            return Response({"success": False, "message": "No file uploaded."}, status=400)

        decoded = io.TextIOWrapper(file.file, encoding="utf-8")
        reader = csv.DictReader(decoded)
        created = []
        for row in reader:
            if not row.get("full_name"):
                continue
            guest = Guest.objects.create(
                invitation=invitation,
                full_name=row.get("full_name", "").strip(),
                email=row.get("email", "").strip(),
                phone=row.get("phone", "").strip(),
                group_name=row.get("group_name", "").strip(),
            )
            created.append(guest)
        return Response(
            {"success": True, "data": GuestSerializer(created, many=True).data},
            status=status.HTTP_201_CREATED,
        )


class GuestViewSet(viewsets.ModelViewSet):
    """PATCH/DELETE /guests/{id}/"""

    serializer_class = GuestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        return Guest.objects.filter(invitation__user=self.request.user).select_related("rsvp")
