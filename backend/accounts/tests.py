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


class PasswordRecoveryTests(APITestCase):
    """Phase 8.2 — forgot password, reset, token expiry/reuse, session sign-out."""

    PASSWORD = "OldPassword!2026"
    NEW_PASSWORD = "BrandNewPass!2026"

    def setUp(self):
        from django.core.cache import cache

        cache.clear()  # throttle counters
        self.user = User.objects.create_user(
            username="reset@example.com", email="reset@example.com", password=self.PASSWORD,
            full_name="Reset User",
        )

    def _forgot(self, email):
        from django.core import mail

        mail.outbox.clear()
        return self.client.post("/api/v1/auth/password/forgot/", {"email": email}, format="json")

    def _link_params(self):
        import re
        from django.core import mail

        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        match = re.search(r"/reset-password\?uid=([\w-]+)&token=([\w-]+)", body)
        self.assertIsNotNone(match, body)
        return {"uid": match.group(1), "token": match.group(2)}

    def _reset(self, params, password=None, confirm=None):
        password = password or self.NEW_PASSWORD
        return self.client.post(
            "/api/v1/auth/password/reset/",
            {**params, "new_password": password, "confirm_password": confirm or password},
            format="json",
        )

    def _login(self, password):
        return self.client.post("/api/v1/auth/login/", {"email": self.user.email, "password": password}, format="json")

    def test_unknown_email_gets_same_response_and_no_email(self):
        from django.core import mail

        known = self._forgot("reset@example.com")
        unknown = self._forgot("nobody@example.com")
        self.assertEqual(known.status_code, 200)
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(known.data["message"], unknown.data["message"])
        self.assertEqual(len(mail.outbox), 0)  # cleared by the second _forgot; none for unknown

    def test_email_has_link_and_html_version(self):
        from django.core import mail

        self._forgot("RESET@example.com")  # case-insensitive
        self.assertEqual(mail.outbox[0].to, ["reset@example.com"])
        self.assertEqual(len(mail.outbox[0].alternatives), 1)
        self._link_params()

    def test_full_reset_flow(self):
        self._forgot(self.user.email)
        params = self._link_params()
        self.assertEqual(self.client.post("/api/v1/auth/password/reset/validate/", params, format="json").status_code, 200)
        r = self._reset(params)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self._login(self.PASSWORD).status_code, 401)
        self.assertEqual(self._login(self.NEW_PASSWORD).status_code, 200)

    def test_link_is_single_use(self):
        self._forgot(self.user.email)
        params = self._link_params()
        self.assertEqual(self._reset(params).status_code, 200)
        reused = self._reset(params, password="AnotherPass!2026")
        self.assertEqual(reused.status_code, 400)
        self.assertIn("invalid or has expired", str(reused.data))
        self.assertEqual(self.client.post("/api/v1/auth/password/reset/validate/", params, format="json").status_code, 400)

    def test_expired_link_is_rejected(self):
        from django.test import override_settings

        self._forgot(self.user.email)
        params = self._link_params()
        with override_settings(PASSWORD_RESET_TIMEOUT=-1):
            r = self._reset(params)
        self.assertEqual(r.status_code, 400)
        self.assertTrue(self.user.__class__.objects.get(pk=self.user.pk).check_password(self.PASSWORD))

    def test_tampered_link_is_rejected(self):
        self._forgot(self.user.email)
        params = self._link_params()
        self.assertEqual(self._reset({**params, "token": params["token"] + "x"}).status_code, 400)
        self.assertEqual(self._reset({**params, "uid": "bm9wZQ"}).status_code, 400)

    def test_weak_and_mismatched_passwords_are_rejected(self):
        self._forgot(self.user.email)
        params = self._link_params()
        weak = self._reset(params, password="123")
        self.assertEqual(weak.status_code, 400)
        self.assertIn("new_password", weak.data)
        mismatch = self._reset(params, password=self.NEW_PASSWORD, confirm="Different!2026")
        self.assertEqual(mismatch.status_code, 400)
        self.assertIn("confirm_password", mismatch.data)

    def test_reset_signs_out_existing_sessions(self):
        tokens = self._login(self.PASSWORD).data
        auth = {"HTTP_AUTHORIZATION": f"Bearer {tokens['access']}"}
        self.assertEqual(self.client.get("/api/v1/users/me/", **auth).status_code, 200)

        self._forgot(self.user.email)
        self.assertEqual(self._reset(self._link_params()).status_code, 200)

        self.assertEqual(self.client.get("/api/v1/users/me/", **auth).status_code, 401)
        refresh = self.client.post("/api/v1/auth/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(refresh.status_code, 401)
        # A fresh login works normally.
        new_tokens = self._login(self.NEW_PASSWORD).data
        self.assertEqual(
            self.client.get("/api/v1/users/me/", HTTP_AUTHORIZATION=f"Bearer {new_tokens['access']}").status_code, 200
        )

    def test_logout_revokes_refresh_token(self):
        tokens = self._login(self.PASSWORD).data
        self.client.post(
            "/api/v1/auth/logout/", {"refresh": tokens["refresh"]}, format="json",
            HTTP_AUTHORIZATION=f"Bearer {tokens['access']}",
        )
        r = self.client.post("/api/v1/auth/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_reset_is_logged_and_notified(self):
        from admin_portal.models import AdminActivityLog
        from notifications.models import Notification

        self._forgot(self.user.email)
        self._reset(self._link_params())
        actions = set(AdminActivityLog.objects.filter(actor=self.user).values_list("action", flat=True))
        self.assertTrue({"PASSWORD_RESET_REQUESTED", "PASSWORD_RESET_COMPLETED"} <= actions)
        self.assertTrue(Notification.objects.filter(user=self.user, title="Your password was changed").exists())
