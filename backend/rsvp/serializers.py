from rest_framework import serializers

from guests.models import Guest
from invitations.models import Invitation

from .models import RSVP


class RSVPSubmitSerializer(serializers.Serializer):
    """Public, no-auth RSVP submission per API Specification.MD POST /rsvp/"""

    invitation_slug = serializers.SlugField()
    guest_id = serializers.UUIDField(required=False, allow_null=True)
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    response = serializers.ChoiceField(choices=RSVP.Response.choices)
    guest_count = serializers.IntegerField(default=1, min_value=1)
    message = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        invitation = Invitation.objects.filter(
            slug=attrs["invitation_slug"], status=Invitation.Status.PUBLISHED, deleted_at__isnull=True
        ).first()
        if not invitation:
            raise serializers.ValidationError({"invitation_slug": "Invitation not found."})
        attrs["invitation"] = invitation
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
                phone=validated_data.get("phone", ""),
            )
        rsvp, _ = RSVP.objects.update_or_create(
            guest=guest,
            defaults={
                "invitation": invitation,
                "response": validated_data["response"],
                "guest_count": validated_data.get("guest_count", 1),
                "message": validated_data.get("message", ""),
            },
        )
        return rsvp


class RSVPSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(source="guest.full_name", read_only=True)

    class Meta:
        model = RSVP
        fields = ["id", "guest", "guest_name", "invitation", "response", "guest_count", "message", "responded_at"]
