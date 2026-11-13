from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from guests.models import Guest
from invitations.models import Invitation
from templates_app.models import InvitationTemplate

from .models import RSVP


class RSVPAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner@example.com", email="owner@example.com", password="StrongPassword!2026"
        )
        self.template = InvitationTemplate.objects.create(
            name="Wedding", category=InvitationTemplate.Category.WEDDING
        )
        self.invitation = Invitation.objects.create(
            user=self.owner,
            template=self.template,
            title="Published Wedding",
            status=Invitation.Status.PUBLISHED,
        )
        self.other_invitation = Invitation.objects.create(
            user=self.owner,
            template=self.template,
            title="Other Wedding",
            status=Invitation.Status.PUBLISHED,
        )
        self.guest = Guest.objects.create(
            invitation=self.invitation, full_name="Known Guest"
        )
        self.other_guest = Guest.objects.create(
            invitation=self.other_invitation, full_name="Other Guest"
        )

    def test_public_guest_can_submit_rsvp(self):
        response = self.client.post(
            "/api/v1/rsvp/",
            {
                "invitation_slug": self.invitation.slug,
                "guest_id": str(self.guest.id),
                "response": "ACCEPTED",
                "guest_count": 2,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RSVP.objects.get(guest=self.guest).response, RSVP.Response.ACCEPTED)

    def test_guest_from_different_invitation_is_rejected_cleanly(self):
        response = self.client.post(
            "/api/v1/rsvp/",
            {
                "invitation_slug": self.invitation.slug,
                "guest_id": str(self.other_guest.id),
                "response": "ACCEPTED",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("guest_id", response.data)
        self.assertEqual(RSVP.objects.count(), 0)

    def test_rsvp_for_unpublished_invitation_is_rejected(self):
        draft = Invitation.objects.create(
            user=self.owner,
            template=self.template,
            title="Draft Event",
            status=Invitation.Status.DRAFT,
        )
        response = self.client.post(
            "/api/v1/rsvp/",
            {"invitation_slug": draft.slug, "response": "MAYBE"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_guest_count_cannot_overflow_small_integer_field(self):
        response = self.client.post(
            "/api/v1/rsvp/",
            {
                "invitation_slug": self.invitation.slug,
                "response": "ACCEPTED",
                "guest_count": 32768,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RSVPAttendeeCountTests(APITestCase):
    """Phase 8.4 — attendee count validation and what the host sees."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="host@example.com", email="host@example.com", password="StrongPassword!2026"
        )
        template = InvitationTemplate.objects.create(name="Wedding", category=InvitationTemplate.Category.WEDDING)
        self.invitation = Invitation.objects.create(
            user=self.owner, template=template, title="W", status=Invitation.Status.PUBLISHED
        )
        self.guest = Guest.objects.create(invitation=self.invitation, full_name="Rahul Sharma", phone_number="+919876543210")

    def rsvp(self, response, count=None, guest=None):
        payload = {"invitation_slug": self.invitation.slug, "guest_id": str((guest or self.guest).id), "response": response}
        if count is not None:
            payload["guest_count"] = count
        return self.client.post("/api/v1/rsvp/", payload, format="json")

    def host_view(self):
        self.client.force_authenticate(self.owner)
        guests = self.client.get(f"/api/v1/invitations/{self.invitation.id}/guests/").data["data"]
        summary = self.client.get(f"/api/v1/invitations/{self.invitation.id}/rsvp/").data["meta"]
        self.client.force_authenticate(None)
        return guests, summary

    def test_accepted_count_reaches_host_guest_list_and_summary(self):
        self.assertEqual(self.rsvp("ACCEPTED", 3).status_code, 201)
        guests, summary = self.host_view()
        self.assertEqual(guests[0]["rsvp_status"], "ACCEPTED")
        self.assertEqual(guests[0]["rsvp_guest_count"], 3)
        self.assertEqual(summary["expected_attendance"], 3)

    def test_limits(self):
        self.assertEqual(self.rsvp("ACCEPTED", 20).status_code, 201)
        over = self.rsvp("ACCEPTED", 21)
        self.assertEqual(over.status_code, 400)
        self.assertIn("20", str(over.data["guest_count"]))
        self.assertEqual(self.rsvp("ACCEPTED", 0).status_code, 400)
        self.assertEqual(self.rsvp("MAYBE", -1).status_code, 400)
        self.assertEqual(self.rsvp("ACCEPTED", "abc").status_code, 400)

    def test_declined_counts_as_zero(self):
        self.assertEqual(self.rsvp("DECLINED", 5).status_code, 201)
        self.assertEqual(RSVP.objects.get(guest=self.guest).guest_count, 0)
        guests, summary = self.host_view()
        self.assertEqual(guests[0]["rsvp_guest_count"], 0)
        self.assertEqual(summary["expected_attendance"], 0)

    def test_maybe_is_reported_separately_and_no_reply_is_null(self):
        other = Guest.objects.create(invitation=self.invitation, full_name="Priya", phone_number="+919876543211")
        self.rsvp("MAYBE", 2)
        guests, summary = self.host_view()
        by_name = {g["full_name"]: g for g in guests}
        self.assertEqual(by_name["Rahul Sharma"]["rsvp_guest_count"], 2)
        self.assertIsNone(by_name[other.full_name]["rsvp_guest_count"])
        self.assertEqual(summary["expected_attendance"], 0)
        self.assertEqual(summary["maybe_attendance"], 2)

    def test_changing_rsvp_updates_count_and_time(self):
        self.rsvp("ACCEPTED", 2)
        first = RSVP.objects.get(guest=self.guest).responded_at
        self.rsvp("ACCEPTED", 4)
        rsvp = RSVP.objects.get(guest=self.guest)
        self.assertEqual(rsvp.guest_count, 4)
        self.assertGreater(rsvp.responded_at, first)

    def test_admin_dashboard_counts_confirmed_attendees(self):
        self.rsvp("ACCEPTED", 3)
        staff = User.objects.create_user(username="s@example.com", email="s@example.com", password="StrongPassword!2026", is_staff=True)
        self.client.force_authenticate(staff)
        self.assertEqual(self.client.get("/api/v1/admin/dashboard/").data["data"]["kpis"]["confirmed_attendees"], 3)
        self.assertEqual(self.client.get("/api/v1/admin/analytics/?days=30").data["data"]["totals"]["confirmed_attendees"], 3)
