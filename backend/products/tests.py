from rest_framework import status
from rest_framework.test import APITestCase

from .models import Product


class ProductCatalogueAPITests(APITestCase):
    def setUp(self):
        self.product = Product.objects.create(
            slug="nexainvite", name="NexaInvite", tagline="Digital invitations",
            description="Create and manage digital invitations.",
            legacy_tagline="Digital invitations & event management",
            legacy_description="Original product overview retained for reference.",
            status="OPERATIONAL", href="/products/nexainvite",
            features=["Templates", "RSVP"], target_audience=["Couples"],
            highlights=["No app required"], active=True,
        )
        Product.objects.create(
            slug="hidden", name="Hidden Product", tagline="Hidden", description="Hidden",
            active=False,
        )

    def test_active_products_are_public(self):
        response = self.client.get("/api/v1/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["slug"], "nexainvite")

    def test_product_detail_includes_marketing_content(self):
        response = self.client.get("/api/v1/products/nexainvite/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["features"], ["Templates", "RSVP"])
        self.assertEqual(response.data["target_audience"], ["Couples"])
        self.assertEqual(response.data["legacy_tagline"], "Digital invitations & event management")
        self.assertEqual(response.data["legacy_description"], "Original product overview retained for reference.")
