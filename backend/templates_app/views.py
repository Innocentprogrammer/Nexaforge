from rest_framework import permissions, viewsets

from .models import InvitationTemplate
from .serializers import InvitationTemplateSerializer


class InvitationTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InvitationTemplate.objects.filter(active=True)
    serializer_class = InvitationTemplateSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ["category", "premium"]

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs
