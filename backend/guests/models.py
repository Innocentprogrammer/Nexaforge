import re
import secrets
import uuid

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models

from invitations.models import Invitation

#: E.164: leading "+", country code that can't start with 0, 8-15 digits total.
E164_PATTERN = r"^\+[1-9]\d{7,14}$"
E164_RE = re.compile(E164_PATTERN)
E164_VALIDATOR = RegexValidator(
    regex=E164_PATTERN,
    message="Enter the number in E.164 format, e.g. +919876543210.",
)

TOKEN_BYTES = 12  # -> 16-char urlsafe slug


def generate_invite_token() -> str:
    return secrets.token_urlsafe(TOKEN_BYTES)


class Guest(models.Model):
    """A person invited to one invitation.

    Guests deliberately carry **no tier of their own**: which features apply to
    them (invite-link export, per-guest PDF, WhatsApp/SMS sends) is decided by
    the host's plan, ``invitation.user.subscription_tier``. See
    ``guests/migrations/0005`` for the removal of the old per-guest column.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name="guests")
    full_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=20, blank=True, validators=[E164_VALIDATOR])
    group_name = models.CharField(max_length=100, blank=True)
    #: Per-guest secret used by GET /public/invite/{token}/ for RSVP attribution.
    unique_token = models.CharField(
        max_length=32, unique=True, default=generate_invite_token, editable=False
    )
    invite_opened_at = models.DateTimeField(null=True, blank=True)
    invitation_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["invitation"]),
            models.Index(fields=["phone_number"]),
            models.Index(fields=["email"]),
        ]
        ordering = ["full_name"]

    @property
    def unique_invite_url(self) -> str:
        """The per-guest link handed out by the gold export and the diamond sends.

        The token is what makes the link per-guest: it is how
        GET /public/invite/{token}/ knows who opened the invitation and who to
        attribute the RSVP to. Point FRONTEND_URL at your tunnel to change the
        host — don't drop the token, or every guest gets the same anonymous link.
        """
        return f"{settings.FRONTEND_URL}/invite/{self.unique_token}"

    def __str__(self):
        return self.full_name


class InviteSendLog(models.Model):
    """One row per delivery attempt made by the send_diamond_invites task."""

    class Channel(models.TextChoices):
        WHATSAPP = "WHATSAPP", "WhatsApp"
        SMS = "SMS", "SMS"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest = models.ForeignKey(Guest, on_delete=models.CASCADE, related_name="send_logs")
    channel = models.CharField(max_length=10, choices=Channel.choices, blank=True, default="")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    provider_message_id = models.CharField(max_length=64, blank=True)
    provider_error = models.TextField(blank=True)
    #: The email copy of the invite link, sent alongside WhatsApp/SMS when the
    #: guest has an address. Blank means no email was attempted (no address).
    email_status = models.CharField(max_length=10, choices=Status.choices, blank=True, default="")
    email_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["guest"]),
            models.Index(fields=["status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.guest.full_name} - {self.channel or '—'} - {self.status}"
