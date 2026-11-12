from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import SubscriptionTier, User
from invitations.models import Invitation
from templates_app.models import InvitationTemplate


class GuestAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner@example.com", email="owner@example.com", password="StrongPassword!2026"
        )
        self.other_user = User.objects.create_user(
            username="other@example.com", email="other@example.com", password="StrongPassword!2026"
        )
        self.template = InvitationTemplate.objects.create(
            name="Wedding", category=InvitationTemplate.Category.WEDDING
        )
        self.invitation = Invitation.objects.create(
            user=self.owner, template=self.template, title="Owner Wedding"
        )

    def test_owner_can_add_guest_to_invitation(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            f"/api/v1/invitations/{self.invitation.id}/guests/",
            {"full_name": "A Guest", "phone_number": "9876543210"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["full_name"], "A Guest")

    def test_other_user_cannot_list_or_add_guests(self):
        self.client.force_authenticate(user=self.other_user)
        url = f"/api/v1/invitations/{self.invitation.id}/guests/"

        list_response = self.client.get(url)
        create_response = self.client.post(url, {"full_name": "Intruder"}, format="json")

        self.assertEqual(list_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(create_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_normal_tier_cannot_export_gold_guest_links(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            f"/api/v1/invitations/{self.invitation.id}/guests/export-links/"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Gold", str(response.data))

    def test_gold_tier_can_export_guest_links(self):
        self.owner.subscription_tier = SubscriptionTier.GOLD
        self.owner.save(update_fields=["subscription_tier"])
        self.client.force_authenticate(user=self.owner)
        self.client.post(
            f"/api/v1/invitations/{self.invitation.id}/guests/",
            {"full_name": "A Guest"},
            format="json",
        )

        response = self.client.post(
            f"/api/v1/invitations/{self.invitation.id}/guests/export-links/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])
