from rest_framework import status
from rest_framework.test import APITestCase

from .models import InvitationTemplate


class InvitationTemplateAPITests(APITestCase):
    def setUp(self):
        self.active_template = InvitationTemplate.objects.create(
            name="Classic Wedding",
            category=InvitationTemplate.Category.WEDDING,
            active=True,
        )
        self.inactive_template = InvitationTemplate.objects.create(
            name="Hidden Wedding",
            category=InvitationTemplate.Category.WEDDING,
            active=False,
        )

    def test_active_templates_are_public(self):
        response = self.client.get("/api/v1/templates/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {row["id"] for row in response.data["results"]}
        self.assertIn(str(self.active_template.id), returned_ids)
        self.assertNotIn(str(self.inactive_template.id), returned_ids)

    def test_templates_can_be_filtered_by_category(self):
        response = self.client.get("/api/v1/templates/?category=WEDDING")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(row["category"] == "WEDDING" for row in response.data["results"]))

    def test_template_detail_is_public(self):
        response = self.client.get(f"/api/v1/templates/{self.active_template.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Classic Wedding")
