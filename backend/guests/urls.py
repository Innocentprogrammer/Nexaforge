from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    GuestImportView,
    GuestViewSet,
    InvitationGuestListView,
    InviteLinksExportView,
    PublicInviteTokenView,
    SendDiamondInvitesView,
    SendStatusView,
)

router = DefaultRouter()
router.register("guests", GuestViewSet, basename="guest")

urlpatterns = [
    path(
        "invitations/<uuid:invitation_id>/guests/",
        InvitationGuestListView.as_view(),
        name="invitation-guests",
    ),
    path(
        "invitations/<uuid:invitation_id>/guests/export-links/",
        InviteLinksExportView.as_view(),
        name="invitation-guests-export-links",
    ),
    path(
        "invitations/<uuid:invitation_id>/guests/send-diamond-invites/",
        SendDiamondInvitesView.as_view(),
        name="invitation-guests-send-diamond",
    ),
    path(
        "invitations/<uuid:invitation_id>/guests/send-status/",
        SendStatusView.as_view(),
        name="invitation-guests-send-status",
    ),
    path("guests/import/", GuestImportView.as_view(), name="guest-import"),
    path(
        "public/invite/<str:token>/",
        PublicInviteTokenView.as_view(),
        name="public-invite-token",
    ),
] + router.urls
