from django.urls import path

from .views import InvitationRSVPListView, RSVPSubmitView

urlpatterns = [
    path("rsvp/", RSVPSubmitView.as_view(), name="rsvp-submit"),
    path("invitations/<uuid:invitation_id>/rsvp/", InvitationRSVPListView.as_view(), name="invitation-rsvp-list"),
]
