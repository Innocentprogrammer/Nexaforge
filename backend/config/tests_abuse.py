"""Stage 3 (Phase 9): rate limiting, trusted-proxy IPs and abuse protections."""

from unittest.mock import patch

from django.core.cache import cache
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings
from rest_framework.test import APITestCase

from accounts.models import SubscriptionTier, User
from config.net import client_ip
from config.throttling import (
    LoginEmailThrottle,
    LoginIPThrottle,
    PaymentOrderThrottle,
    PublicPageThrottle,
    RegisterThrottle,
    RSVPThrottle,
)
from guests.models import Guest, InviteSendLog
from invitations.models import Invitation
from templates_app.models import InvitationTemplate

# Tests normally run with a dummy cache (throttles off). These need real counters.
REAL_CACHE = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


class ClientIPTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(NUM_PROXIES=0)
    def test_forwarded_header_ignored_without_trusted_proxy(self):
        request = self.factory.get("/", HTTP_X_FORWARDED_FOR="6.6.6.6", REMOTE_ADDR="10.0.0.5")
        self.assertEqual(client_ip(request), "10.0.0.5")

    @override_settings(NUM_PROXIES=1)
    def test_one_proxy_uses_the_address_it_appended(self):
        # Client forged "6.6.6.6"; nginx appended the real peer "203.0.113.9".
        request = self.factory.get(
            "/", HTTP_X_FORWARDED_FOR="6.6.6.6, 203.0.113.9", REMOTE_ADDR="172.18.0.4"
        )
        self.assertEqual(client_ip(request), "203.0.113.9")

    @override_settings(NUM_PROXIES=1)
    def test_garbage_is_rejected(self):
        request = self.factory.get("/", HTTP_X_FORWARDED_FOR="not-an-ip", REMOTE_ADDR="172.18.0.4")
        self.assertIsNone(client_ip(request))


@override_settings(CACHES=REAL_CACHE)
class ThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="t@example.com", email="t@example.com", password="StrongPassword!2026"
        )

    def tearDown(self):
        cache.clear()

    def _login(self, email="t@example.com", ip="10.0.0.1", forged=None):
        extra = {"REMOTE_ADDR": ip}
        if forged:
            extra["HTTP_X_FORWARDED_FOR"] = forged
        return self.client.post(
            "/api/v1/auth/login/", {"email": email, "password": "wrong"}, format="json", **extra
        )

    def test_login_is_limited_per_ip_and_forged_headers_do_not_help(self):
        with patch.object(LoginIPThrottle, "rate", "3/min", create=True), patch.object(LoginEmailThrottle, "rate", "100/min", create=True):
            codes = [self._login(email=f"u{i}@example.com", forged=f"9.9.9.{i}").status_code for i in range(4)]
        self.assertEqual(codes[:3], [401, 401, 401])
        self.assertEqual(codes[3], 429)

    def test_login_is_limited_per_account_across_ips(self):
        with patch.object(LoginIPThrottle, "rate", "100/min", create=True), patch.object(LoginEmailThrottle, "rate", "3/hour", create=True):
            codes = [self._login(ip=f"10.0.1.{i}").status_code for i in range(4)]
            other_account = self._login(email="someone-else@example.com", ip="10.0.1.99").status_code
        self.assertEqual(codes[3], 429)
        self.assertEqual(other_account, 401)  # other accounts unaffected

    def test_registration_is_limited(self):
        with patch.object(RegisterThrottle, "rate", "2/hour", create=True):
            codes = [
                self.client.post(
                    "/api/v1/auth/register/",
                    {"email": f"new{i}@example.com", "password": "StrongPassword!2026", "full_name": "N"},
                    format="json",
                ).status_code
                for i in range(3)
            ]
        self.assertEqual(codes[2], 429)

    def test_public_rsvp_is_limited(self):
        template = InvitationTemplate.objects.create(name="W", category=InvitationTemplate.Category.WEDDING)
        invitation = Invitation.objects.create(
            user=self.user, template=template, title="W", status=Invitation.Status.PUBLISHED
        )
        payload = {"invitation_slug": invitation.slug, "full_name": "Spam", "response": "ACCEPTED"}
        with patch.object(RSVPThrottle, "rate", "2/hour", create=True):
            codes = [self.client.post("/api/v1/rsvp/", payload, format="json").status_code for _ in range(3)]
            page = self.client.get(f"/api/v1/public/invitations/{invitation.slug}/").status_code
        self.assertEqual(codes, [201, 201, 429])
        self.assertEqual(page, 200)  # separate scope; reading the page still works

    def test_public_invitation_page_is_limited(self):
        with patch.object(PublicPageThrottle, "rate", "2/min", create=True):
            codes = [self.client.get("/api/v1/public/invitations/nope/").status_code for _ in range(3)]
        self.assertEqual(codes, [404, 404, 429])

    def test_payment_orders_are_limited_per_user(self):
        self.client.force_authenticate(self.user)
        with patch.object(PaymentOrderThrottle, "rate", "1/hour", create=True):
            first = self.client.post("/api/v1/payments/create-order/", {"plan_code": "GOLD"}, format="json")
            second = self.client.post("/api/v1/payments/create-order/", {"plan_code": "GOLD"}, format="json")
        self.assertNotEqual(first.status_code, 429)
        self.assertEqual(second.status_code, 429)


class ActivityLogIPTests(APITestCase):
    @override_settings(NUM_PROXIES=0)
    def test_failed_login_records_socket_ip_not_forged_header(self):
        from admin_portal.models import AdminActivityLog

        user = User.objects.create_user(
            username="a@example.com", email="a@example.com", password="StrongPassword!2026"
        )
        self.client.post(
            "/api/v1/auth/login/",
            {"email": user.email, "password": "wrong"},
            format="json",
            REMOTE_ADDR="10.20.30.40",
            HTTP_X_FORWARDED_FOR="6.6.6.6",
        )
        entry = AdminActivityLog.objects.filter(action="USER_LOGIN_FAILED").latest("created_at")
        self.assertEqual(entry.ip_address, "10.20.30.40")


class PublicRSVPHardeningTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="h@example.com", email="h@example.com", password="StrongPassword!2026",
            subscription_tier=SubscriptionTier.DIAMOND,
        )
        template = InvitationTemplate.objects.create(name="W", category=InvitationTemplate.Category.WEDDING)
        self.invitation = Invitation.objects.create(
            user=self.owner, template=template, title="W", status=Invitation.Status.PUBLISHED
        )

    def _rsvp(self, **fields):
        payload = {"invitation_slug": self.invitation.slug, "full_name": "Walk-in", "response": "ACCEPTED", **fields}
        return self.client.post("/api/v1/rsvp/", payload, format="json")

    def test_invalid_phone_is_rejected(self):
        response = self._rsvp(phone="call me maybe")
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data)
        self.assertFalse(Guest.objects.filter(invitation=self.invitation).exists())

    def test_local_phone_is_normalised_and_guest_marked_self_registered(self):
        response = self._rsvp(phone="98765 43210")
        self.assertEqual(response.status_code, 201)
        guest = Guest.objects.get(invitation=self.invitation)
        self.assertEqual(guest.phone_number, "+919876543210")
        self.assertEqual(guest.source, Guest.Source.PUBLIC_RSVP)

    def test_phone_stays_optional(self):
        self.assertEqual(self._rsvp().status_code, 201)

    def test_message_length_is_capped(self):
        self.assertEqual(self._rsvp(message="x" * 1001).status_code, 400)
        self.assertEqual(self._rsvp(message="x" * 1000).status_code, 201)


@override_settings(
    INVITE_SEND_BACKEND="console",
    INVITE_SEND_DELAY_SECONDS=0,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class SelfRegisteredGuestSendTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="d@example.com", email="d@example.com", password="StrongPassword!2026",
            subscription_tier=SubscriptionTier.DIAMOND,
        )
        self.client.force_authenticate(self.owner)
        template = InvitationTemplate.objects.create(name="W", category=InvitationTemplate.Category.WEDDING)
        self.invitation = Invitation.objects.create(user=self.owner, template=template, title="W")
        self.url = f"/api/v1/invitations/{self.invitation.id}/guests/send-diamond-invites/"
        self.walk_in = Guest.objects.create(
            invitation=self.invitation, full_name="Walk-in", phone_number="+919876543299",
            source=Guest.Source.PUBLIC_RSVP,
        )

    def test_send_all_skips_self_registered_guests(self):
        host_guest = Guest.objects.create(
            invitation=self.invitation, full_name="Known", phone_number="+919876543210"
        )
        response = self.client.post(self.url, format="json")
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["data"]["queued"], 1)
        self.assertIn("Skipped 1 self-registered", response.data["message"])
        self.assertTrue(InviteSendLog.objects.filter(guest=host_guest).exists())
        self.assertFalse(InviteSendLog.objects.filter(guest=self.walk_in).exists())

    def test_host_can_still_send_to_one_individually(self):
        response = self.client.post(self.url, {"guest_ids": [str(self.walk_in.id)]}, format="json")
        self.assertEqual(response.status_code, 202)
        self.assertTrue(InviteSendLog.objects.filter(guest=self.walk_in).exists())

    def test_send_all_with_only_self_registered_guests_is_a_clear_400(self):
        response = self.client.post(self.url, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("individually", response.data["message"])


class PaymentErrorMessageTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient

        from subscriptions.models import PlanCode, SubscriptionPlan

        self.client = APIClient()
        self.user = User.objects.create_user(
            username="p@example.com", email="p@example.com", password="StrongPassword!2026"
        )
        SubscriptionPlan.objects.create(code=PlanCode.GOLD, name="Gold", amount=29900, currency="INR", duration_days=30)
        self.client.force_authenticate(self.user)

    @override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
    def test_missing_configuration_is_not_described_to_the_customer(self):
        response = self.client.post("/api/v1/payments/create-order/", {"plan_code": "GOLD"}, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("key", response.data["message"].lower())
        self.assertNotIn("razorpay", response.data["message"].lower())

    @patch("subscriptions.views.gateway.create_order")
    def test_gateway_response_detail_is_not_passed_through(self, create_order):
        from subscriptions import gateway

        create_order.side_effect = gateway.GatewayError(
            'Razorpay rejected the order request: {"error": {"code": "BAD_REQUEST_ERROR", "internal": "x"}}'
        )
        with self.assertLogs("subscriptions.views", level="ERROR") as logs:
            response = self.client.post("/api/v1/payments/create-order/", {"plan_code": "GOLD"}, format="json")
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("BAD_REQUEST_ERROR", response.data["message"])
        self.assertIn("BAD_REQUEST_ERROR", "\n".join(logs.output))  # kept for operators
