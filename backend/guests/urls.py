from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import GuestImportView, GuestViewSet, InvitationGuestListView

router = DefaultRouter()
router.register("guests", GuestViewSet, basename="guest")

urlpatterns = [
    path(
        "invitations/<uuid:invitation_id>/guests/",
        InvitationGuestListView.as_view(),
        name="invitation-guests",
    ),
    path("guests/import/", GuestImportView.as_view(), name="guest-import"),
] + router.urls
