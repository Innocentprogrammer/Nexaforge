import hashlib
import json
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from admin_portal.activity import Action, log_activity

from . import gateway
from .models import Payment, PlanCode, Subscription, SubscriptionPlan, WebhookEvent
from .serializers import PaymentSerializer, SubscriptionPlanSerializer, SubscriptionSerializer


def _safe_gateway_payload(payload):
    """Persist only payment fields needed for reconciliation; omit customer PII."""
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    allowed = (
        "id", "order_id", "amount", "currency", "status", "method",
        "error_code", "error_description", "created_at",
    )
    return {
        "event": payload.get("event"),
        "payment": {key: entity.get(key) for key in allowed if key in entity},
    }


def _activate_payment(payment, gateway_payment_id, payload=None):
    """Idempotently capture a payment and activate its purchased subscription."""
    payment = Payment.objects.select_for_update().select_related("subscription", "plan", "user").get(pk=payment.pk)
    if payment.status == Payment.Status.CAPTURED:
        return payment

    payment.status = Payment.Status.CAPTURED
    payment.gateway_payment_id = gateway_payment_id
    if payload is not None:
        payment.gateway_payload = payload
    payment.failure_reason = ""
    payment.save(update_fields=["status", "gateway_payment_id", "gateway_payload", "failure_reason", "updated_at"])

    now = timezone.now()
    subscription = Subscription.objects.select_for_update().get(pk=payment.subscription_id)
    # A newly paid plan replaces any previously active plan only after payment confirmation.
    Subscription.objects.filter(user=payment.user, status=Subscription.Status.ACTIVE).exclude(pk=subscription.pk).update(
        status=Subscription.Status.EXPIRED, updated_at=now
    )
    subscription.status = Subscription.Status.ACTIVE
    subscription.starts_at = now
    subscription.ends_at = now + timedelta(days=subscription.duration_days)
    subscription.save(update_fields=["status", "starts_at", "ends_at", "updated_at"])
    previous_tier = payment.user.subscription_tier
    payment.user.subscription_tier = payment.plan.code
    payment.user.save(update_fields=["subscription_tier", "updated_at"])
    log_activity(
        Action.PAYMENT_CAPTURED, actor=payment.user, target=payment,
        summary=f"Payment of ₹{payment.amount / 100:,.2f} captured for the {payment.plan.name} plan",
        metadata={"gateway_payment_id": gateway_payment_id, "amount_paise": payment.amount},
    )
    log_activity(
        Action.SUBSCRIPTION_ACTIVATED, actor=payment.user, target=subscription,
        summary=f"{payment.plan.name} plan active until {subscription.ends_at:%d %b %Y}",
        metadata={"from_tier": previous_tier, "to_tier": payment.plan.code},
    )
    from notifications.services import create_notification
    create_notification(
        user=payment.user,
        category="BILLING",
        title="Payment successful – plan activated",
        message=f"Your {payment.plan.name} plan is active until {subscription.ends_at:%d %b %Y}.",
        action_url="/dashboard/billing",
        metadata={"subscription_id": str(subscription.pk), "payment_id": str(payment.pk), "event": "PAYMENT_CAPTURED"},
    )
    return payment


class PlanListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        plans = SubscriptionPlan.objects.filter(is_active=True)
        return Response({"success": True, "data": SubscriptionPlanSerializer(plans, many=True).data})


class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_code = str(request.data.get("plan_code", "")).upper()
        plan = get_object_or_404(SubscriptionPlan, code=plan_code, is_active=True)
        if plan.code == PlanCode.NORMAL or plan.amount <= 0:
            return Response({"success": False, "message": "The Normal plan is free and does not require checkout."}, status=status.HTTP_400_BAD_REQUEST)

        receipt = f"ni_{uuid.uuid4().hex[:24]}"
        try:
            order = gateway.create_order(
                amount=plan.amount,
                currency=plan.currency,
                receipt=receipt,
                notes={"user_id": str(request.user.pk), "plan_code": plan.code},
            )
        except gateway.GatewayConfigurationError as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except gateway.GatewayError as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        with transaction.atomic():
            subscription = Subscription.objects.create(user=request.user, plan=plan, duration_days=plan.duration_days)
            payment = Payment.objects.create(
                user=request.user,
                subscription=subscription,
                plan=plan,
                gateway_order_id=order["id"],
                amount=plan.amount,
                currency=plan.currency,
                gateway_payload={"order": order},
            )
        log_activity(
            Action.PAYMENT_ORDER_CREATED, request=request, target=payment,
            summary=f"Started checkout for the {plan.name} plan",
            metadata={"order_id": order["id"], "amount_paise": plan.amount},
        )

        return Response({
            "success": True,
            "data": {
                "payment_id": str(payment.pk),
                "order_id": order["id"],
                "amount": plan.amount,
                "currency": plan.currency,
                "key_id": settings.RAZORPAY_KEY_ID,
                "plan": SubscriptionPlanSerializer(plan).data,
            },
        }, status=status.HTTP_201_CREATED)


class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = str(request.data.get("razorpay_order_id", ""))
        payment_id = str(request.data.get("razorpay_payment_id", ""))
        signature = str(request.data.get("razorpay_signature", ""))
        if not all([order_id, payment_id, signature]):
            return Response({"success": False, "message": "Order ID, payment ID and signature are required."}, status=status.HTTP_400_BAD_REQUEST)

        payment = get_object_or_404(Payment, gateway_order_id=order_id, user=request.user)
        try:
            valid = gateway.verify_payment_signature(order_id=order_id, payment_id=payment_id, signature=signature)
        except gateway.GatewayConfigurationError as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not valid:
            return Response({"success": False, "message": "Payment signature verification failed."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            gateway_payment = gateway.fetch_payment(payment_id)
        except gateway.GatewayConfigurationError as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except gateway.GatewayError as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        if (
            gateway_payment.get("order_id") != order_id
            or gateway_payment.get("amount") != payment.amount
            or gateway_payment.get("currency") != payment.currency
            or gateway_payment.get("status") != "captured"
        ):
            return Response({"success": False, "message": "Razorpay payment details do not match this order or are not captured yet."}, status=status.HTTP_400_BAD_REQUEST)

        safe_payment = {
            key: gateway_payment.get(key)
            for key in ("id", "order_id", "amount", "currency", "status", "method", "created_at")
            if key in gateway_payment
        }
        with transaction.atomic():
            _activate_payment(payment, payment_id, {"verified_via": "checkout", "payment": safe_payment})
        return Response({"success": True, "message": "Payment verified and subscription activated."})


class RazorpayWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_body = request.body
        signature = request.headers.get("X-Razorpay-Signature", "")
        try:
            valid = gateway.verify_webhook_signature(body=raw_body, signature=signature)
        except gateway.GatewayConfigurationError as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not valid:
            return Response({"success": False, "message": "Invalid webhook signature."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return Response({"success": False, "message": "Invalid JSON payload."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(payload, dict):
            return Response({"success": False, "message": "Webhook payload must be a JSON object."}, status=status.HTTP_400_BAD_REQUEST)

        event_type = payload.get("event", "unknown")
        event_id = request.headers.get("X-Razorpay-Event-Id") or hashlib.sha256(raw_body).hexdigest()
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")
        payment_id = entity.get("id")

        with transaction.atomic():
            event, created = WebhookEvent.objects.get_or_create(
                event_id=event_id,
                defaults={"event_type": event_type, "payload": _safe_gateway_payload(payload)},
            )
            if not created and event.processed:
                return Response({"success": True, "message": "Webhook already processed."})

            if event_type in ("payment.captured", "payment.failed") and order_id:
                payment = Payment.objects.select_for_update().filter(gateway_order_id=order_id).first()
                if payment:
                    if event_type == "payment.captured" and payment_id:
                        if (
                            entity.get("amount") == payment.amount
                            and entity.get("currency") == payment.currency
                            and entity.get("status") == "captured"
                        ):
                            _activate_payment(payment, payment_id, _safe_gateway_payload(payload))
                        else:
                            payment.failure_reason = "Captured amount or currency does not match the local order; manual review required."
                            payment.gateway_payload = _safe_gateway_payload(payload)
                            payment.save(update_fields=["failure_reason", "gateway_payload", "updated_at"])
                    elif event_type == "payment.failed" and payment.status != Payment.Status.CAPTURED:
                        payment.status = Payment.Status.FAILED
                        payment.failure_reason = str(entity.get("error_description") or "Payment failed")[:255]
                        payment.gateway_payload = _safe_gateway_payload(payload)
                        payment.save(update_fields=["status", "failure_reason", "gateway_payload", "updated_at"])
                        payment.subscription.status = Subscription.Status.CANCELLED
                        payment.subscription.save(update_fields=["status", "updated_at"])
                        log_activity(
                            Action.PAYMENT_FAILED, actor=payment.user, target=payment,
                            summary=f"Payment failed for the {payment.plan.name} plan",
                            metadata={"reason": payment.failure_reason, "source": "webhook"},
                        )
                        from notifications.services import create_notification
                        create_notification(
                            user=payment.user,
                            category="BILLING",
                            title="Payment unsuccessful",
                            message="Your payment could not be completed. You can try again from Plan & Billing.",
                            action_url="/dashboard/billing",
                            metadata={"payment_id": str(payment.pk), "event": "PAYMENT_FAILED"},
                        )
            event.processed = True
            event.processed_at = timezone.now()
            event.save(update_fields=["processed", "processed_at"])

        return Response({"success": True, "message": "Webhook accepted."})


class MySubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subscription = Subscription.objects.filter(user=request.user, status=Subscription.Status.ACTIVE).select_related("plan").first()
        return Response({"success": True, "data": SubscriptionSerializer(subscription).data if subscription else None})


class PaymentHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(user=request.user).select_related("plan")[:100]
        return Response({"success": True, "data": PaymentSerializer(payments, many=True).data})
