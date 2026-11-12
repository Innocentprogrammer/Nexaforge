from rest_framework import serializers

from .models import E164_RE, Guest, InviteSendLog
from .phone import normalize_phone_number


class GuestSerializer(serializers.ModelSerializer):
    rsvp_status = serializers.SerializerMethodField()
    unique_invite_url = serializers.CharField(read_only=True)
    # Declared explicitly with `validators=[]` to drop the model's E164_VALIDATOR
    # from the field. DRF runs field validators BEFORE validate_<field>, so
    # leaving it on would reject "9876543210" before normalisation ever ran.
    phone_number = serializers.CharField(
        max_length=20, required=False, allow_blank=True, validators=[]
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
            "created_at",
        ]
        read_only_fields = [
            "id",
            "invitation",
            "unique_token",
            "unique_invite_url",
            "invite_opened_at",
            "created_at",
        ]

    def validate_phone_number(self, value):
        """Accept the local spellings people actually type, store E.164."""
        normalized = normalize_phone_number(value)
        if not normalized:
            return ""
        if not E164_RE.match(normalized):
            raise serializers.ValidationError(
                f"Could not read '{value}' as a phone number. Use E.164 "
                f"(+919876543210) or a plain national number."
            )
        return normalized

    def get_rsvp_status(self, obj):
        rsvp = getattr(obj, "rsvp", None)
        return rsvp.response if rsvp else "PENDING"


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
