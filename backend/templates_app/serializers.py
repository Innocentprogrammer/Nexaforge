from rest_framework import serializers

from .models import InvitationTemplate


class InvitationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvitationTemplate
        fields = [
            "id",
            "name",
            "category",
            "thumbnail",
            "preview_image",
            "template_json",
            "premium",
            "price",
            "active",
            "created_at",
        ]
