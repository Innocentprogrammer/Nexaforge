from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from templates_app.models import InvitationTemplate

from .models import Invitation


class InvitationAPITests(APITestCase):
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
            user=self.owner, template=self.template, title="A Wedding"
        )

    def test_create_assigns_authenticated_owner(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            "/api/v1/invitations/",
            {"template": str(self.template.id), "title": "New Event"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Invitation.objects.get(title="New Event")
        self.assertEqual(created.user, self.owner)

    def test_user_cannot_retrieve_another_users_invitation(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get(f"/api/v1/invitations/{self.invitation.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_publish_another_users_invitation(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(f"/api/v1/invitations/{self.invitation.id}/publish/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.invitation.refresh_from_db()
        self.assertEqual(self.invitation.status, Invitation.Status.DRAFT)

    def test_draft_is_not_public_but_published_invitation_is(self):
        draft_response = self.client.get(
            f"/api/v1/public/invitations/{self.invitation.slug}/"
        )
        self.assertEqual(draft_response.status_code, status.HTTP_404_NOT_FOUND)

        self.invitation.status = Invitation.Status.PUBLISHED
        self.invitation.save(update_fields=["status"])
        public_response = self.client.get(
            f"/api/v1/public/invitations/{self.invitation.slug}/"
        )
        self.assertEqual(public_response.status_code, status.HTTP_200_OK)
        self.assertNotIn("user", public_response.data["data"])

    def test_soft_deleted_invitation_is_not_public(self):
        from django.utils import timezone

        self.invitation.status = Invitation.Status.PUBLISHED
        self.invitation.deleted_at = timezone.now()
        self.invitation.save(update_fields=["status", "deleted_at"])

        response = self.client.get(
            f"/api/v1/public/invitations/{self.invitation.slug}/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
