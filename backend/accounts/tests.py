from rest_framework import status
from rest_framework.test import APITestCase

from .models import SubscriptionTier, User


class AuthenticationAPITests(APITestCase):
    def test_registration_creates_user_with_normal_tier(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "full_name": "Test Customer",
                "email": "customer@example.com",
                "phone": "+919876543210",
                "password": "StrongPassword!2026",
                "confirm_password": "StrongPassword!2026",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="customer@example.com")
        self.assertTrue(user.check_password("StrongPassword!2026"))
        self.assertEqual(user.subscription_tier, SubscriptionTier.NORMAL)
        self.assertNotIn("password", response.data["data"])

    def test_registration_rejects_password_mismatch(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            {
                "full_name": "Test Customer",
                "email": "mismatch@example.com",
                "password": "StrongPassword!2026",
                "confirm_password": "DifferentPassword!2026",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="mismatch@example.com").exists())

    def test_user_cannot_upgrade_own_tier_through_profile_api(self):
        user = User.objects.create_user(
            username="normal@example.com",
            email="normal@example.com",
            password="StrongPassword!2026",
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/v1/users/me/", {"subscription_tier": "DIAMOND"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.subscription_tier, SubscriptionTier.NORMAL)

    def test_profile_endpoint_requires_authentication(self):
        response = self.client.get("/api/v1/users/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
