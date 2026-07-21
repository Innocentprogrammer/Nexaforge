from rest_framework import serializers

from .models import Guest


class GuestSerializer(serializers.ModelSerializer):
    rsvp_status = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = [
            "id",
            "invitation",
            "full_name",
            "email",
            "phone",
            "group_name",
            "invitation_sent",
            "rsvp_status",
            "created_at",
        ]
        read_only_fields = ["id", "invitation", "created_at"]

    def get_rsvp_status(self, obj):
        rsvp = getattr(obj, "rsvp", None)
        return rsvp.response if rsvp else "PENDING"
