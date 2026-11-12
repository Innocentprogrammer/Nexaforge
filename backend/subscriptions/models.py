import uuid

from django.conf import settings
from django.db import models


class PlanCode(models.TextChoices):
    NORMAL = "NORMAL", "Normal"
    GOLD = "GOLD", "Gold"
    DIAMOND = "DIAMOND", "Diamond"


class SubscriptionPlan(models.Model):
    """Purchasable account tier. Prices are stored in the smallest currency unit (paise)."""

    code = models.CharField(max_length=10, choices=PlanCode.choices, unique=True)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=255, blank=True)
    amount = models.PositiveIntegerField(help_text="Amount in paise; 29900 means INR 299.00.")
    currency = models.CharField(max_length=3, default="INR")
    duration_days = models.PositiveSmallIntegerField(default=30)
    features = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "amount"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Subscription(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    duration_days = models.PositiveSmallIntegerField(default=30, help_text="Duration captured when the order was created.")
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "status"], name="sub_user_status_idx"), models.Index(fields=["status", "ends_at"], name="sub_status_ends_idx")]

    def __str__(self):
        return f"{self.user_id}: {self.plan.code} ({self.status})"


class Payment(models.Model):
    class Status(models.TextChoices):
        CREATED = "CREATED", "Created"
        AUTHORIZED = "AUTHORIZED", "Authorized"
        CAPTURED = "CAPTURED", "Captured"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payments")
    subscription = models.OneToOneField(Subscription, on_delete=models.PROTECT, related_name="payment")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="payments")
    gateway_order_id = models.CharField(max_length=80, unique=True, null=True, blank=True)
    gateway_payment_id = models.CharField(max_length=80, unique=True, null=True, blank=True)
    amount = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default="INR")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.CREATED)
    failure_reason = models.CharField(max_length=255, blank=True)
    gateway_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"], name="pay_user_created_idx"), models.Index(fields=["status", "created_at"], name="pay_status_created_idx")]

    def __str__(self):
        return f"{self.user_id}: {self.amount} {self.currency} ({self.status})"


class WebhookEvent(models.Model):
    """Webhook idempotency ledger; duplicate deliveries are safe to acknowledge."""

    event_id = models.CharField(max_length=100, unique=True)
    event_type = models.CharField(max_length=100)
    processed = models.BooleanField(default=False)
    payload = models.JSONField(default=dict, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.event_type}: {self.event_id}"
