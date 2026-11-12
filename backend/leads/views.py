from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .serializers import LeadSerializer


class LeadRateThrottle(AnonRateThrottle):
    scope = "leads"


class LeadCreateView(generics.CreateAPIView):
    serializer_class = LeadSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LeadRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "message": "Thanks — we'll be in touch within one business day.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
