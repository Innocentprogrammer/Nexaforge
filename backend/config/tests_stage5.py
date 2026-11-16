"""Phase 9 Stage 5: logout by refresh token, and no plan downgrade purchases."""
from datetime import timedelta
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
import itertools

from accounts.models import User
from admin_portal.models import AdminActivityLog
from subscriptions.models import Payment, PlanCode, Subscription, SubscriptionPlan

LOGOUT = "/api/v1/auth/logout/"
REFRESH = "/api/v1/auth/refresh/"


def make_user(email):
    return User.objects.create_user(username=email, email=email, password="StrongPass123!")


def login(email):
    r = APIClient().post("/api/v1/auth/login/", {"email": email, "password": "StrongPass123!"}, format="json")
    assert r.status_code == 200, r.data
    return r.data


class LogoutTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = make_user("a@example.com")
        self.other = make_user("b@example.com")

    def test_logout_without_access_token_revokes_refresh(self):
        refresh = login(self.user.email)["refresh"]
        r = self.client.post(LOGOUT, {"refresh": refresh}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.post(REFRESH, {"refresh": refresh}, format="json").status_code, 401)
        log = AdminActivityLog.objects.get(action="USER_LOGOUT")
        self.assertEqual(log.actor, self.user)

    def test_logout_rejects_someone_elses_token(self):
        victim_refresh = login(self.other.email)["refresh"]
        self.client.force_authenticate(self.user)
        r = self.client.post(LOGOUT, {"refresh": victim_refresh}, format="json")
        self.assertEqual(r.status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(REFRESH, {"refresh": victim_refresh}, format="json").status_code, 200)

    def test_logout_with_matching_access_token(self):
        tokens = login(self.user.email)
        r = self.client.post(
            LOGOUT, {"refresh": tokens["refresh"]}, format="json",
            HTTP_AUTHORIZATION=f"Bearer {tokens['access']}",
        )
        self.assertEqual(r.status_code, 200)

    def test_missing_token_is_400_and_bad_token_is_harmless(self):
        self.assertEqual(self.client.post(LOGOUT, {}, format="json").status_code, 400)
        r = self.client.post(LOGOUT, {"refresh": "garbage"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(AdminActivityLog.objects.filter(action="USER_LOGOUT").exists())

    def test_logout_twice_is_fine(self):
        refresh = login(self.user.email)["refresh"]
        self.client.post(LOGOUT, {"refresh": refresh}, format="json")
        self.assertEqual(self.client.post(LOGOUT, {"refresh": refresh}, format="json").status_code, 200)


_ids = itertools.count()


@patch(
    "subscriptions.views.gateway.create_order",
    side_effect=lambda **kw: {"id": f"order_{next(_ids)}", "amount": kw["amount"], "currency": "INR"},
)
class NoDowngradeTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = make_user("buyer@example.com")
        self.client.force_authenticate(self.user)
        self.gold = SubscriptionPlan.objects.create(code=PlanCode.GOLD, name="Gold", amount=29900)
        self.diamond = SubscriptionPlan.objects.create(code=PlanCode.DIAMOND, name="Diamond", amount=99900)

    def _activate(self, plan, ends_in=timedelta(days=10)):
        Subscription.objects.create(
            user=self.user, plan=plan, status=Subscription.Status.ACTIVE,
            starts_at=timezone.now(), ends_at=timezone.now() + ends_in,
        )

    def _buy(self, code):
        return self.client.post("/api/v1/payments/create-order/", {"plan_code": code}, format="json")

    def test_cannot_buy_gold_while_diamond_active(self, _):
        self._activate(self.diamond)
        r = self._buy("GOLD")
        self.assertEqual(r.status_code, 400)
        self.assertIn("Diamond", r.data["message"])
        self.assertEqual(Payment.objects.count(), 0)

    def test_can_upgrade_and_renew(self, _):
        self._activate(self.gold)
        self.assertEqual(self._buy("DIAMOND").status_code, 201)
        self.assertEqual(self._buy("GOLD").status_code, 201)

    def test_lapsed_higher_plan_does_not_block(self, _):
        self._activate(self.diamond, ends_in=timedelta(minutes=-1))
        self.assertEqual(self._buy("GOLD").status_code, 201)
