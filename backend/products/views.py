from rest_framework import permissions, viewsets
from rest_framework.pagination import PageNumberPagination

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(active=True)
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    filterset_fields = ["status"]
    pagination_class = PageNumberPagination
