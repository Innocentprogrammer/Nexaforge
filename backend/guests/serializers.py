from rest_framework import serializers

from .models import E164_RE, Guest, InviteSendLog
from .phone import normalize_phone_number


class GuestSerializer(serializers.ModelSerializer):
    rsvp_status = serializers.SerializerMethodField()
    #: Attendees on the guest's RSVP (them included); 0 if declined, null if no reply yet.
    rsvp_guest_count = serializers.SerializerMethodField()
    rsvp_message = serializers.SerializerMethodField()
    rsvp_responded_at = serializers.SerializerMethodField()
    unique_invite_url = serializers.CharField(read_only=True)
    # Declared explicitly with `validators=[]` to drop the model's E164_VALIDATOR
    # from the field. DRF runs field validators BEFORE validate_<field>, so
    # leaving it on would reject "9876543210" before normalisation ever ran.
    # Name and phone number are both mandatory for a guest.
    full_name = serializers.CharField(
        max_length=150,
        error_messages={"blank": "Name is required.", "required": "Name is required."},
    )
    phone_number = serializers.CharField(
        max_length=20,
        validators=[],
        error_messages={
            "blank": "Phone number is required.",
            "required": "Phone number is required.",
        },
    )

    class Meta:
        model = Guest
        fields = [
            "id",
            "invitation",
            "full_name",
            "email",
            "phone_number",
            "group_name",
            "unique_token",
            "unique_invite_url",
            "invite_opened_at",
            "invitation_sent",
            "rsvp_status",
            "rsvp_guest_count",
            "rsvp_message",
            "rsvp_responded_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "invitation",
            # Set only by the send task (guests/tasks.py), never by a client.
            "invitation_sent",
            "unique_token",
            "unique_invite_url",
            "invite_opened_at",
            "created_at",
        ]

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name is required.")
        return value

    def validate_phone_number(self, value):
        """Accept the local spellings people actually type, store E.164."""
        normalized = normalize_phone_number(value)
        if not normalized:
            raise serializers.ValidationError("Phone number is required.")
        if not E164_RE.match(normalized):
            raise serializers.ValidationError(
                f"Could not read '{value}' as a phone number. Use E.164 "
                f"(+919876543210) or a plain national number."
            )
        return normalized

    def validate(self, attrs):
        """Reject a phone number that another guest on this invitation already has."""
        phone = attrs.get("phone_number")
        invitation = self.context.get("invitation") or getattr(self.instance, "invitation", None)
        if phone and invitation is not None:
            clash = invitation.guests.filter(phone_number=phone)
            if self.instance is not None:
                clash = clash.exclude(pk=self.instance.pk)
            existing = clash.first()
            if existing:
                raise serializers.ValidationError(
                    {
                        "phone_number": (
                            f"Duplicate guest — {existing.full_name} already has "
                            f"the number {phone} on this invitation."
                        )
                    }
                )
        return attrs

    def get_rsvp_status(self, obj):
        rsvp = getattr(obj, "rsvp", None)
        return rsvp.response if rsvp else "PENDING"

    def get_rsvp_guest_count(self, obj):
        rsvp = getattr(obj, "rsvp", None)
        if rsvp is None:
            return None
        # Older declined RSVPs were stored with a count of 1; nobody is coming.
        return 0 if rsvp.response == "DECLINED" else rsvp.guest_count

    def get_rsvp_message(self, obj):
        rsvp = getattr(obj, "rsvp", None)
        return rsvp.message if rsvp else ""

    def get_rsvp_responded_at(self, obj):
        rsvp = getattr(obj, "rsvp", None)
        return rsvp.responded_at if rsvp else None


class GuestSendStatusSerializer(serializers.ModelSerializer):
    """Per-guest view of the latest diamond-invite delivery attempt."""

    channel = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    error = serializers.SerializerMethodField()
    last_attempt_at = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = [
            "id",
            "full_name",
            "phone_number",
            "channel",
            "status",
            "error",
            "last_attempt_at",
        ]

    def _latest(self, obj) -> InviteSendLog | None:
        logs = obj.send_logs.all()
        return logs[0] if logs else None

    def get_channel(self, obj):
        log = self._latest(obj)
        return log.channel if log else ""

    def get_status(self, obj):
        log = self._latest(obj)
        # No log row yet means the task hasn't reached this guest — still queued.
        return log.status if log else InviteSendLog.Status.PENDING.value

    def get_error(self, obj):
        log = self._latest(obj)
        return log.provider_error if log else ""

    def get_last_attempt_at(self, obj):
        log = self._latest(obj)
        return log.updated_at if log else None
