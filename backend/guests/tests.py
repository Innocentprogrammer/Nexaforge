from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import SubscriptionTier, User
from guests.models import InviteSendLog
from invitations.models import Invitation
from templates_app.models import InvitationTemplate


class GuestAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner@example.com", email="owner@example.com", password="StrongPassword!2026"
        )
        self.other_user = User.objects.create_user(
            username="other@example.com", email="other@example.com", password="StrongPassword!2026"
        )
        self.template = InvitationTemplate.objects.create(
            name="Wedding", category=InvitationTemplate.Category.WEDDING
        )
        self.invitation = Invitation.objects.create(
            user=self.owner, template=self.template, title="Owner Wedding"
        )

    def test_owner_can_add_guest_to_invitation(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            f"/api/v1/invitations/{self.invitation.id}/guests/",
            {"full_name": "A Guest", "phone_number": "9876543210"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["full_name"], "A Guest")

    def test_other_user_cannot_list_or_add_guests(self):
        self.client.force_authenticate(user=self.other_user)
        url = f"/api/v1/invitations/{self.invitation.id}/guests/"

        list_response = self.client.get(url)
        create_response = self.client.post(url, {"full_name": "Intruder"}, format="json")

        self.assertEqual(list_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(create_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_normal_tier_cannot_export_gold_guest_links(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            f"/api/v1/invitations/{self.invitation.id}/guests/export-links/"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Gold", str(response.data))

    def test_gold_tier_can_export_guest_links(self):
        self.owner.subscription_tier = SubscriptionTier.GOLD
        self.owner.save(update_fields=["subscription_tier"])
        self.client.force_authenticate(user=self.owner)
        self.client.post(
            f"/api/v1/invitations/{self.invitation.id}/guests/",
            {"full_name": "A Guest", "phone_number": "9876543210"},
            format="json",
        )

        response = self.client.post(
            f"/api/v1/invitations/{self.invitation.id}/guests/export-links/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])


class GuestCSVImportTests(APITestCase):
    """Spreadsheet-exported CSVs used to import 0 guests or crash with a 500."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="gold@example.com",
            email="gold@example.com",
            password="StrongPassword!2026",
            subscription_tier=SubscriptionTier.GOLD,
        )
        template = InvitationTemplate.objects.create(
            name="Wedding", category=InvitationTemplate.Category.WEDDING
        )
        self.invitation = Invitation.objects.create(
            user=self.owner, template=template, title="Gold Wedding"
        )
        self.client.force_authenticate(user=self.owner)

    def _upload(self, content: bytes):
        from django.core.files.uploadedfile import SimpleUploadedFile

        return self.client.post(
            "/api/v1/guests/import/",
            {
                "invitation_id": str(self.invitation.id),
                "file": SimpleUploadedFile("guests.csv", content, content_type="text/csv"),
            },
            format="multipart",
        )

    def test_standard_csv(self):
        r = self._upload(b"full_name,email,phone_number,group_name\nA,a@x.com,9876543210,Fam\n")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["meta"]["imported"], 1)

    def test_spreadsheet_style_headers(self):
        r = self._upload(b"Full Name,Email,Phone Number,Group Name\r\nA,a@x.com,9876543210,Fam\r\n")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["meta"]["imported"], 1)
        self.assertEqual(r.data["data"][0]["phone_number"], "+919876543210")
        self.assertEqual(r.data["data"][0]["group_name"], "Fam")

    def test_semicolon_delimited(self):
        r = self._upload(b"full_name;email;phone_number;group_name\nA;a@x.com;9876543210;Fam\n")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["meta"]["imported"], 1)

    def test_windows_1252_encoding(self):
        content = "full_name,email,phone_number\nJosé,a@x.com,9876543210\n".encode("cp1252")
        r = self._upload(content)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["data"][0]["full_name"], "José")

    def test_utf16_tab_separated(self):
        content = "full_name\temail\tphone_number\nA\ta@x.com\t9876543210\n".encode("utf-16")
        r = self._upload(content)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["meta"]["imported"], 1)

    def test_missing_name_column_is_a_clear_400(self):
        r = self._upload(b"email,phone_number\na@x.com,9876543210\n")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name column", r.data["message"])
        self.assertEqual(self.invitation.guests.count(), 0)

    def test_missing_phone_column_rejects_file(self):
        r = self._upload(b"full_name,email\nA,a@x.com\n")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone number column", r.data["message"])
        self.assertEqual(self.invitation.guests.count(), 0)

    def test_row_missing_name_or_phone_rejects_whole_file(self):
        r = self._upload(
            b"full_name,phone_number\nA,9876543210\nB,\n,9876543212\n"
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Row 3: missing phone number", r.data["message"])
        self.assertIn("Row 4: missing name", r.data["message"])
        self.assertEqual(self.invitation.guests.count(), 0)

    def test_blank_lines_are_ignored(self):
        r = self._upload(b"full_name,phone_number\nA,9876543210\n,\n\n")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["meta"]["imported"], 1)

    def test_reimporting_same_file_collapses_duplicates(self):
        content = b"full_name,phone_number\nA,9876543210\nB,9876543211\n"
        self.assertEqual(self._upload(content).data["meta"]["imported"], 2)
        r = self._upload(content)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["meta"]["imported"], 0)
        self.assertEqual(r.data["meta"]["duplicates_collapsed"], 2)
        self.assertEqual(r.data["meta"]["duplicates"][0]["collapsed_onto"], "A")
        self.assertEqual(self.invitation.guests.count(), 2)

    def test_duplicates_within_file_collapse(self):
        r = self._upload(b"full_name,phone_number\nA,9876543210\nA again,+91 98765 43210\n")
        self.assertEqual(r.data["meta"]["imported"], 1)
        self.assertEqual(r.data["meta"]["duplicates_collapsed"], 1)


class AddGuestValidationTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="o@example.com", email="o@example.com", password="StrongPassword!2026"
        )
        template = InvitationTemplate.objects.create(
            name="Wedding", category=InvitationTemplate.Category.WEDDING
        )
        self.invitation = Invitation.objects.create(user=self.owner, template=template, title="W")
        self.url = f"/api/v1/invitations/{self.invitation.id}/guests/"
        self.client.force_authenticate(user=self.owner)

    def test_phone_is_required(self):
        r = self.client.post(self.url, {"full_name": "A"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone_number", r.data)

    def test_name_is_required(self):
        r = self.client.post(self.url, {"full_name": "  ", "phone_number": "9876543210"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("full_name", r.data)

    def test_duplicate_phone_is_rejected(self):
        self.client.post(self.url, {"full_name": "A", "phone_number": "9876543210"}, format="json")
        r = self.client.post(
            self.url, {"full_name": "B", "phone_number": "+91 98765 43210"}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Duplicate guest", str(r.data["phone_number"]))
        self.assertEqual(self.invitation.guests.count(), 1)

    def test_editing_guest_keeps_own_number(self):
        r = self.client.post(self.url, {"full_name": "A", "phone_number": "9876543210"}, format="json")
        guest_id = r.data["data"]["id"]
        r = self.client.patch(
            f"/api/v1/guests/{guest_id}/",
            {"full_name": "A2", "phone_number": "9876543210"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)


class GuestInviteRSVPStatusTests(APITestCase):
    """A guest who already RSVP'd sees that on refresh, and can't re-submit."""

    def setUp(self):
        from guests.models import Guest

        owner = User.objects.create_user(
            username="h@example.com", email="h@example.com", password="StrongPassword!2026",
            subscription_tier=SubscriptionTier.GOLD,
        )
        template = InvitationTemplate.objects.create(
            name="Wedding", category=InvitationTemplate.Category.WEDDING
        )
        self.invitation = Invitation.objects.create(
            user=owner, template=template, title="W", status=Invitation.Status.PUBLISHED
        )
        self.guest = Guest.objects.create(
            invitation=self.invitation, full_name="A", phone_number="+919876543210"
        )
        self.url = f"/api/v1/public/invite/{self.guest.unique_token}/"

    def _rsvp(self):
        return self.client.post(
            "/api/v1/rsvp/",
            {
                "invitation_slug": self.invitation.slug,
                "guest_id": str(self.guest.id),
                "response": "ACCEPTED",
                "guest_count": 2,
            },
            format="json",
        )

    def test_rsvp_status_in_token_payload(self):
        self.assertIsNone(self.client.get(self.url).data["data"]["guest"]["rsvp"])
        self.assertEqual(self._rsvp().status_code, status.HTTP_201_CREATED)
        rsvp = self.client.get(self.url).data["data"]["guest"]["rsvp"]
        self.assertEqual(rsvp["response"], "ACCEPTED")
        self.assertEqual(rsvp["guest_count"], 2)

    def test_guest_can_change_rsvp(self):
        from rsvp.models import RSVP

        self._rsvp()
        r = self.client.post(
            "/api/v1/rsvp/",
            {
                "invitation_slug": self.invitation.slug,
                "guest_id": str(self.guest.id),
                "response": "DECLINED",
                "guest_count": 1,
                "message": "Sorry!",
            },
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RSVP.objects.filter(guest=self.guest).count(), 1)
        rsvp = self.client.get(self.url).data["data"]["guest"]["rsvp"]
        self.assertEqual(rsvp["response"], "DECLINED")
        self.assertEqual(rsvp["message"], "Sorry!")


@override_settings(
    INVITE_SEND_BACKEND="console",
    INVITE_SEND_DELAY_SECONDS=0,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class DiamondSendTests(APITestCase):
    """Per-guest sends, and the email copy of the invite link."""

    def setUp(self):
        from guests.models import Guest

        self.owner = User.objects.create_user(
            username="d@example.com", email="d@example.com", password="StrongPassword!2026",
            subscription_tier=SubscriptionTier.DIAMOND,
        )
        self.client.force_authenticate(self.owner)
        template = InvitationTemplate.objects.create(
            name="Wedding", category=InvitationTemplate.Category.WEDDING
        )
        self.invitation = Invitation.objects.create(user=self.owner, template=template, title="Our Wedding")
        self.with_email = Guest.objects.create(
            invitation=self.invitation, full_name="Asha", phone_number="+919876543210",
            email="asha@example.com",
        )
        self.no_email = Guest.objects.create(
            invitation=self.invitation, full_name="Bina", phone_number="+919876543211",
        )
        self.url = f"/api/v1/invitations/{self.invitation.id}/guests/send-diamond-invites/"

    def test_single_guest_send_emails_their_personal_link(self):
        res = self.client.post(self.url, {"guest_ids": [str(self.with_email.id)]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(res.data["data"]["queued"], 1)

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["asha@example.com"])
        self.assertIn(self.with_email.unique_invite_url, mail.outbox[0].body)
        self.assertIn(self.with_email.unique_invite_url, mail.outbox[0].alternatives[0][0])

        log = self.with_email.send_logs.get()
        self.assertEqual(log.status, InviteSendLog.Status.SENT)
        self.assertEqual(log.email_status, InviteSendLog.Status.SENT)
        # Only the requested guest was touched.
        self.assertFalse(self.no_email.send_logs.exists())

    def test_send_all_skips_email_for_guests_without_one(self):
        res = self.client.post(self.url, format="json")
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(len(mail.outbox), 1)
        log = self.no_email.send_logs.get()
        self.assertEqual(log.status, InviteSendLog.Status.SENT)
        self.assertEqual(log.email_status, "")

        rows = self.client.get(
            f"/api/v1/invitations/{self.invitation.id}/guests/send-status/"
        ).data["data"]
        by_name = {row["full_name"]: row for row in rows}
        self.assertEqual(by_name["Asha"]["email_status"], "SENT")
        self.assertEqual(by_name["Bina"]["email_status"], "")

    def test_email_failure_is_recorded_without_failing_the_whatsapp_send(self):
        with patch("guests.tasks.EmailMultiAlternatives.send", side_effect=OSError("smtp down")):
            self.client.post(self.url, {"guest_ids": [str(self.with_email.id)]}, format="json")
        log = self.with_email.send_logs.get()
        self.assertEqual(log.status, InviteSendLog.Status.SENT)
        self.assertEqual(log.email_status, InviteSendLog.Status.FAILED)
        self.assertIn("smtp down", log.email_error)

    def test_guest_from_another_invitation_is_rejected(self):
        from guests.models import Guest

        other = Invitation.objects.create(
            user=self.owner, template=self.invitation.template, title="Other"
        )
        stranger = Guest.objects.create(invitation=other, full_name="C", phone_number="+919876543212")
        res = self.client.post(self.url, {"guest_ids": [str(stranger.id)]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(mail.outbox), 0)

    def test_invalid_guest_id_is_rejected(self):
        res = self.client.post(self.url, {"guest_ids": ["not-a-uuid"]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
