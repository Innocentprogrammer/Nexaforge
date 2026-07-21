from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import InvitationViewSet, PublicInvitationView

router = DefaultRouter()
router.register("invitations", InvitationViewSet, basename="invitation")

urlpatterns = [
    path("public/invitations/<slug:slug>/", PublicInvitationView.as_view(), name="public-invitation"),
] + router.urls
