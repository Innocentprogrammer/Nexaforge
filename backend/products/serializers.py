from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "slug",
            "name",
            "tagline",
            "description",
            "legacy_tagline",
            "legacy_description",
            "status",
            "icon_key",
            "href",
            "order",
            "features",
            "target_audience",
            "highlights",
        ]
