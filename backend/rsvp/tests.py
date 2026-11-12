from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from guests.models import Guest
from invitations.models import Invitation
from templates_app.models import InvitationTemplate

from .models import RSVP


class RSVPAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner@example.com", email="owner@example.com", password="StrongPassword!2026"
        )
        self.template = InvitationTemplate.objects.create(
            name="Wedding", category=InvitationTemplate.Category.WEDDING
        )
        self.invitation = Invitation.objects.create(
            user=self.owner,
            template=self.template,
            title="Published Wedding",
            status=Invitation.Status.PUBLISHED,
        )
        self.other_invitation = Invitation.objects.create(
            user=self.owner,
            template=self.template,
            title="Other Wedding",
            status=Invitation.Status.PUBLISHED,
        )
        self.guest = Guest.objects.create(
            invitation=self.invitation, full_name="Known Guest"
        )
        self.other_guest = Guest.objects.create(
            invitation=self.other_invitation, full_name="Other Guest"
        )

    def test_public_guest_can_submit_rsvp(self):
        response = self.client.post(
            "/api/v1/rsvp/",
            {
                "invitation_slug": self.invitation.slug,
                "guest_id": str(self.guest.id),
                "response": "ACCEPTED",
                "guest_count": 2,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RSVP.objects.get(guest=self.guest).response, RSVP.Response.ACCEPTED)

    def test_guest_from_different_invitation_is_rejected_cleanly(self):
        response = self.client.post(
            "/api/v1/rsvp/",
            {
                "invitation_slug": self.invitation.slug,
                "guest_id": str(self.other_guest.id),
                "response": "ACCEPTED",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("guest_id", response.data)
        self.assertEqual(RSVP.objects.count(), 0)

    def test_rsvp_for_unpublished_invitation_is_rejected(self):
        draft = Invitation.objects.create(
            user=self.owner,
            template=self.template,
            title="Draft Event",
            status=Invitation.Status.DRAFT,
        )
        response = self.client.post(
            "/api/v1/rsvp/",
            {"invitation_slug": draft.slug, "response": "MAYBE"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_guest_count_cannot_overflow_small_integer_field(self):
        response = self.client.post(
            "/api/v1/rsvp/",
            {
                "invitation_slug": self.invitation.slug,
                "response": "ACCEPTED",
                "guest_count": 32768,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
