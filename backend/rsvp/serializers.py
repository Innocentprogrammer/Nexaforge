from rest_framework import serializers

from guests.models import E164_RE, Guest
from guests.phone import normalize_phone_number
from invitations.models import Invitation

from django.utils import timezone

from .models import MAX_ATTENDEES_PER_RSVP, RSVP

#: Cap on the free-text note a guest can leave (it is shown to, and emailed to, the host).
MAX_RSVP_MESSAGE_LENGTH = 1000


class RSVPSubmitSerializer(serializers.Serializer):
    """Public, no-auth RSVP submission per API Specification.MD POST /rsvp/"""

    invitation_slug = serializers.SlugField()
    guest_id = serializers.UUIDField(required=False, allow_null=True)
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    response = serializers.ChoiceField(choices=RSVP.Response.choices)
    # Number of attendees, the guest included. Ignored (stored as 0) for DECLINED.
    guest_count = serializers.IntegerField(
        default=1,
        min_value=0,
        max_value=MAX_ATTENDEES_PER_RSVP,
        error_messages={
            "max_value": f"At most {MAX_ATTENDEES_PER_RSVP} attendees per RSVP, including you.",
            "invalid": "Enter the number of attendees as a whole number.",
        },
    )
    message = serializers.CharField(required=False, allow_blank=True, max_length=MAX_RSVP_MESSAGE_LENGTH)

    def validate_phone(self, value):
        """Optional, but when given it must be a real number.

        Local spellings are accepted ("98765 43210", "09876543210") and
        normalised to E.164; anything else is rejected rather than stored, since
        a stored number can later receive WhatsApp/SMS messages.
        """
        if not value or not value.strip():
            return ""
        normalized = normalize_phone_number(value)
        if not E164_RE.match(normalized):
            raise serializers.ValidationError(
                "Enter a valid phone number, e.g. 98765 43210 or +919876543210."
            )
        return normalized

    def validate(self, attrs):
        invitation = Invitation.objects.filter(
            slug=attrs["invitation_slug"], status=Invitation.Status.PUBLISHED, deleted_at__isnull=True
        ).first()
        if not invitation:
            raise serializers.ValidationError({"invitation_slug": "Invitation not found."})
        attrs["invitation"] = invitation

        # A guest identifier is public input. Validate that it belongs to this
        # invitation here so a mismatched or forged ID returns a clean 400
        # instead of allowing Guest.DoesNotExist to become a server error.
        if attrs["response"] == RSVP.Response.DECLINED:
            attrs["guest_count"] = 0  # nobody is coming
        elif attrs.get("guest_count", 1) < 1:
            raise serializers.ValidationError(
                {"guest_count": "At least 1 attendee (you) is needed when you accept or say maybe."}
            )

        guest_id = attrs.get("guest_id")
        if guest_id and not Guest.objects.filter(id=guest_id, invitation=invitation).exists():
            raise serializers.ValidationError(
                {"guest_id": "This guest does not belong to the selected invitation."}
            )
        return attrs

    def create(self, validated_data):
        invitation = validated_data["invitation"]
        guest_id = validated_data.get("guest_id")
        if guest_id:
            guest = Guest.objects.get(id=guest_id, invitation=invitation)
        else:
            guest = Guest.objects.create(
                invitation=invitation,
                full_name=validated_data.get("full_name") or "Guest",
                email=validated_data.get("email", ""),
                # Validated and normalised to E.164 in validate_phone().
                phone_number=validated_data.get("phone", ""),
                source=Guest.Source.PUBLIC_RSVP,
            )
        previous = RSVP.objects.filter(guest=guest).first()
        rsvp, created = RSVP.objects.update_or_create(
            guest=guest,
            defaults={
                "invitation": invitation,
                "response": validated_data["response"],
                "guest_count": validated_data.get("guest_count", 1),
                "message": validated_data.get("message", ""),
                # auto_now_add only stamps the first reply; a changed RSVP is
                # a new response, so its time moves too.
                "responded_at": timezone.now(),
            },
        )
        self.context["rsvp_created"] = created
        self.context["rsvp_changed"] = (
            True if previous is None else (
                created
                or previous.response != rsvp.response
                or previous.guest_count != rsvp.guest_count
                or previous.message != rsvp.message
            )
        )
        return rsvp


class RSVPSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(source="guest.full_name", read_only=True)

    class Meta:
        model = RSVP
        fields = ["id", "guest", "guest_name", "invitation", "response", "guest_count", "message", "responded_at"]
