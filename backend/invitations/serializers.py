from rest_framework import serializers

from templates_app.serializers import InvitationTemplateSerializer

from .models import Invitation


class InvitationSerializer(serializers.ModelSerializer):
    template_detail = InvitationTemplateSerializer(source="template", read_only=True)

    class Meta:
        model = Invitation
        fields = [
            "id",
            "template",
            "template_detail",
            "title",
            "slug",
            "event_type",
            "event_date",
            "venue",
            "invitation_json",
            "status",
            "qr_code",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "status", "qr_code", "created_at", "updated_at"]


class PublicInvitationSerializer(serializers.ModelSerializer):
    """Used for the no-auth public invitation page — excludes owner-only data."""

    template_detail = InvitationTemplateSerializer(source="template", read_only=True)

    class Meta:
        model = Invitation
        fields = [
            "id",
            "title",
            "slug",
            "event_type",
            "event_date",
            "venue",
            "invitation_json",
            "template_detail",
        ]
