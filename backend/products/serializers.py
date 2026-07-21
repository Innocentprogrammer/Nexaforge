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
            "status",
            "icon_key",
            "href",
            "order",
        ]
