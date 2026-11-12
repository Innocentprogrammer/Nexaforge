from rest_framework import serializers

from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "category", "title", "message", "action_url", "metadata",
            "is_read", "read_at", "email_status", "created_at",
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "email_enabled", "email_account", "email_invitations",
            "email_rsvp", "email_billing", "updated_at",
        ]
        read_only_fields = ["updated_at"]
