import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Category(models.TextChoices):
        ACCOUNT = "ACCOUNT", "Account"
        INVITATION = "INVITATION", "Invitation"
        RSVP = "RSVP", "RSVP"
        BILLING = "BILLING", "Billing"
        SYSTEM = "SYSTEM", "System"

    class EmailStatus(models.TextChoices):
        NOT_REQUESTED = "NOT_REQUESTED", "Not requested"
        PENDING = "PENDING", "Pending"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"
        SKIPPED = "SKIPPED", "Skipped"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    category = models.CharField(max_length=12, choices=Category.choices, default=Category.SYSTEM)
    title = models.CharField(max_length=180)
    message = models.TextField()
    action_url = models.CharField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    email_status = models.CharField(
        max_length=16,
        choices=EmailStatus.choices,
        default=EmailStatus.NOT_REQUESTED,
    )
    email_error = models.TextField(blank=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "created_at"], name="notif_user_read_created_idx"),
            models.Index(fields=["user", "category", "created_at"], name="notif_user_category_idx"),
        ]

    def __str__(self):
        return f"{self.user_id}: {self.title}"


class NotificationPreference(models.Model):
    """Email preferences. In-app notifications are always retained."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preference",
    )
    email_enabled = models.BooleanField(default=True)
    email_account = models.BooleanField(default=True)
    email_invitations = models.BooleanField(default=True)
    email_rsvp = models.BooleanField(default=True)
    email_billing = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def allows(self, category: str) -> bool:
        if not self.email_enabled:
            return False
        field_by_category = {
            Notification.Category.ACCOUNT: "email_account",
            Notification.Category.INVITATION: "email_invitations",
            Notification.Category.RSVP: "email_rsvp",
            Notification.Category.BILLING: "email_billing",
        }
        field = field_by_category.get(category)
        return getattr(self, field, True) if field else True

    def __str__(self):
        return f"Notification preferences for {self.user_id}"
