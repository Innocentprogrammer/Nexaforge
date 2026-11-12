import hashlib
import hmac
import json
from unittest.mock import patch
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Payment, PlanCode, Subscription, SubscriptionPlan, WebhookEvent
from .tasks import expire_subscriptions

User = get_user_model()


class SubscriptionPaymentAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="buyer@example.com", email="buyer@example.com", password="StrongPassword!2026"
        )
        self.gold = SubscriptionPlan.objects.create(
            code=PlanCode.GOLD, name="Gold", amount=29900, currency="INR", duration_days=30
        )
        self.normal = SubscriptionPlan.objects.create(
            code=PlanCode.NORMAL, name="Normal", amount=0, currency="INR", duration_days=3650
        )

    def test_plan_list_is_public(self):
        response = self.client.get("/api/v1/subscription-plans/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"][0]["code"], PlanCode.NORMAL)

    @patch("subscriptions.views.gateway.create_order")
    def test_authenticated_user_can_create_paid_order(self, create_order):
        create_order.return_value = {"id": "order_test_123", "amount": 29900, "currency": "INR"}
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/v1/payments/create-order/", {"plan_code": "GOLD"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["order_id"], "order_test_123")
        payment = Payment.objects.get(gateway_order_id="order_test_123")
        self.assertEqual(payment.amount, 29900)
        self.assertEqual(payment.status, Payment.Status.CREATED)
        self.assertEqual(payment.subscription.status, Subscription.Status.PENDING)

    def test_normal_plan_does_not_create_payment_order(self):
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/v1/payments/create-order/", {"plan_code": "NORMAL"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Payment.objects.count(), 0)

    @patch("subscriptions.views.gateway.verify_payment_signature", return_value=False)
    @patch("subscriptions.views.gateway.create_order", return_value={"id": "order_bad_sig"})
    def test_invalid_payment_signature_does_not_activate_subscription(self, create_order, verify_signature):
        self.client.force_authenticate(self.user)
        self.client.post("/api/v1/payments/create-order/", {"plan_code": "GOLD"}, format="json")
        response = self.client.post("/api/v1/payments/verify/", {
            "razorpay_order_id": "order_bad_sig",
            "razorpay_payment_id": "pay_fake",
            "razorpay_signature": "invalid",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.subscription_tier, "NORMAL")

    @patch("subscriptions.views.gateway.fetch_payment", return_value={
        "id": "pay_verified", "order_id": "order_verified", "amount": 29900,
        "currency": "INR", "status": "captured"
    })
    @patch("subscriptions.views.gateway.verify_payment_signature", return_value=True)
    @patch("subscriptions.views.gateway.create_order", return_value={"id": "order_verified"})
    def test_valid_payment_signature_activates_plan(self, create_order, verify_signature, fetch_payment):
        self.client.force_authenticate(self.user)
        self.client.post("/api/v1/payments/create-order/", {"plan_code": "GOLD"}, format="json")
        response = self.client.post("/api/v1/payments/verify/", {
            "razorpay_order_id": "order_verified",
            "razorpay_payment_id": "pay_verified",
            "razorpay_signature": "valid-signature",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.subscription_tier, "GOLD")
        payment = Payment.objects.get(gateway_order_id="order_verified")
        self.assertEqual(payment.status, Payment.Status.CAPTURED)
        self.assertEqual(payment.subscription.status, Subscription.Status.ACTIVE)

    @override_settings(RAZORPAY_WEBHOOK_SECRET="webhook-test-secret")
    @patch("subscriptions.views.gateway.create_order", return_value={"id": "order_webhook"})
    def test_captured_webhook_is_idempotent(self, create_order):
        self.client.force_authenticate(self.user)
        self.client.post("/api/v1/payments/create-order/", {"plan_code": "GOLD"}, format="json")
        self.client.force_authenticate(user=None)
        payload = {
            "event": "payment.captured",
            "payload": {"payment": {"entity": {
                "id": "pay_webhook", "order_id": "order_webhook", "amount": 29900, "currency": "INR", "status": "captured"
            }}},
        }
        body = json.dumps(payload).encode()
        signature = hmac.new(b"webhook-test-secret", body, hashlib.sha256).hexdigest()
        headers = {"HTTP_X_RAZORPAY_SIGNATURE": signature, "HTTP_X_RAZORPAY_EVENT_ID": "evt_webhook_1"}
        first = self.client.generic("POST", "/api/v1/payments/webhook/razorpay/", body, content_type="application/json", **headers)
        second = self.client.generic("POST", "/api/v1/payments/webhook/razorpay/", body, content_type="application/json", **headers)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(WebhookEvent.objects.count(), 1)
        self.user.refresh_from_db()
        self.assertEqual(self.user.subscription_tier, "GOLD")


    @override_settings(RAZORPAY_WEBHOOK_SECRET="webhook-test-secret")
    @patch("subscriptions.views.gateway.create_order", return_value={"id": "order_wrong_amount"})
    def test_captured_webhook_with_wrong_amount_does_not_activate_plan(self, create_order):
        self.client.force_authenticate(self.user)
        self.client.post("/api/v1/payments/create-order/", {"plan_code": "GOLD"}, format="json")
        self.client.force_authenticate(user=None)
        payload = {
            "event": "payment.captured",
            "payload": {"payment": {"entity": {
                "id": "pay_wrong_amount", "order_id": "order_wrong_amount", "amount": 100,
                "currency": "INR", "status": "captured"
            }}},
        }
        body = json.dumps(payload).encode()
        signature = hmac.new(b"webhook-test-secret", body, hashlib.sha256).hexdigest()
        response = self.client.generic(
            "POST", "/api/v1/payments/webhook/razorpay/", body,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=signature,
            HTTP_X_RAZORPAY_EVENT_ID="evt_wrong_amount",
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.subscription_tier, "NORMAL")
        payment = Payment.objects.get(gateway_order_id="order_wrong_amount")
        self.assertIn("does not match", payment.failure_reason)


    def test_expiry_task_restores_normal_tier(self):
        self.user.subscription_tier = "GOLD"
        self.user.save(update_fields=["subscription_tier"])
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.gold,
            status=Subscription.Status.ACTIVE,
            starts_at=timezone.now() - timedelta(days=31),
            ends_at=timezone.now() - timedelta(days=1),
        )
        expire_subscriptions.run()
        subscription.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(subscription.status, Subscription.Status.EXPIRED)
        self.assertEqual(self.user.subscription_tier, "NORMAL")

    def test_payment_history_is_scoped_to_authenticated_user(self):
        other = User.objects.create_user(username="other@example.com", email="other@example.com", password="StrongPassword!2026")
        subscription = Subscription.objects.create(user=other, plan=self.gold)
        Payment.objects.create(user=other, subscription=subscription, plan=self.gold, amount=29900)
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/v1/payments/history/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"], [])


class RazorpaySignatureTests(TestCase):
    @override_settings(RAZORPAY_KEY_ID="rzp_test_key", RAZORPAY_KEY_SECRET="payment-secret")
    def test_checkout_signature_uses_constant_time_hmac_validation(self):
        from .gateway import verify_payment_signature

        message = b"order_123|pay_456"
        signature = hmac.new(b"payment-secret", message, hashlib.sha256).hexdigest()
        self.assertTrue(verify_payment_signature(order_id="order_123", payment_id="pay_456", signature=signature))
        self.assertFalse(verify_payment_signature(order_id="order_123", payment_id="pay_456", signature="wrong"))

    @override_settings(RAZORPAY_WEBHOOK_SECRET="webhook-secret")
    def test_webhook_signature_is_bound_to_raw_request_body(self):
        from .gateway import verify_webhook_signature

        body = b'{"event":"payment.captured"}'
        signature = hmac.new(b"webhook-secret", body, hashlib.sha256).hexdigest()
        self.assertTrue(verify_webhook_signature(body=body, signature=signature))
        self.assertFalse(verify_webhook_signature(body=body + b" ", signature=signature))
