from rest_framework import serializers

from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ["id", "full_name", "email", "company", "message", "source", "created_at"]
        read_only_fields = ["id", "created_at"]
