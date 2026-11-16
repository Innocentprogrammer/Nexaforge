"""Stage 4 (Phase 9): application fixes — tier gates, soft deletes, uploads,
email handling, Celery settings and request-time subscription expiry."""

import smtplib
from datetime import timedelta
from io import BytesIO
from unittest.mock import patch

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APITestCase

from accounts.models import SubscriptionTier, User
from guests.models import Guest
from invitations.models import Invitation
from templates_app.models import InvitationTemplate


def make_user(email, tier=SubscriptionTier.NORMAL):
    return User.objects.create_user(
        username=email, email=email, password="StrongPassword!2026", subscription_tier=tier
    )


class FixtureMixin:
    def make_invitation(self, owner, **extra):
        template, _ = InvitationTemplate.objects.get_or_create(
            name="W", defaults={"category": InvitationTemplate.Category.WEDDING}
        )
        return Invitation.objects.create(user=owner, template=template, title="W", **extra)


class PerGuestLinkGateTests(FixtureMixin, APITestCase):
    def _guest_payload(self, tier):
        owner = make_user(f"{tier.lower()}@example.com", tier)
        invitation = self.make_invitation(owner)
        guest = Guest.objects.create(invitation=invitation, full_name="A", phone_number="+919876543210")
        self.client.force_authenticate(owner)
        listed = self.client.get(f"/api/v1/invitations/{invitation.id}/guests/").data["data"][0]
        detail = self.client.get(f"/api/v1/guests/{guest.id}/").data
        return listed, detail

    def test_normal_plan_does_not_receive_per_guest_links(self):
        for payload in self._guest_payload(SubscriptionTier.NORMAL):
            self.assertNotIn("unique_invite_url", payload)
            self.assertNotIn("unique_token", payload)
            self.assertIn("full_name", payload)  # the rest of the guest is intact

    def test_gold_plan_still_receives_them(self):
        for payload in self._guest_payload(SubscriptionTier.GOLD):
            self.assertIn("/invite/", payload["unique_invite_url"])


class SoftDeletedInvitationTests(FixtureMixin, APITestCase):
    def setUp(self):
        self.owner = make_user("o@example.com", SubscriptionTier.DIAMOND)
        self.invitation = self.make_invitation(self.owner, deleted_at=timezone.now())
        self.guest = Guest.objects.create(invitation=self.invitation, full_name="A", phone_number="+919876543210")
        self.client.force_authenticate(self.owner)

    def test_guest_and_rsvp_endpoints_treat_it_as_gone(self):
        base = f"/api/v1/invitations/{self.invitation.id}"
        self.assertEqual(self.client.get(f"{base}/guests/").status_code, 404)
        self.assertEqual(self.client.post(f"{base}/guests/", {"full_name": "B", "phone_number": "9876543211"}).status_code, 404)
        self.assertEqual(self.client.get(f"{base}/rsvp/").status_code, 404)
        self.assertEqual(self.client.post(f"{base}/guests/send-diamond-invites/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/v1/guests/{self.guest.id}/").status_code, 404)
        self.assertTrue(Guest.objects.filter(pk=self.guest.pk).exists())  # data kept, just not reachable


class GuestImportValidationTests(APITestCase):
    def test_malformed_invitation_id_is_a_400_not_a_500(self):
        self.client.force_authenticate(make_user("g@example.com", SubscriptionTier.GOLD))
        csv_file = SimpleUploadedFile("g.csv", b"name,phone\nA,9876543210\n", content_type="text/csv")
        response = self.client.post(
            "/api/v1/guests/import/", {"invitation_id": "abc", "file": csv_file}, format="multipart"
        )
        self.assertEqual(response.status_code, 400)


class ProfileImageTests(APITestCase):
    def test_profile_image_cannot_be_uploaded_through_the_api(self):
        user = make_user("p@example.com")
        self.client.force_authenticate(user)
        buffer = BytesIO()
        Image.new("RGB", (10, 10)).save(buffer, format="PNG")
        upload = SimpleUploadedFile("me.png", buffer.getvalue(), content_type="image/png")
        response = self.client.patch("/api/v1/users/me/", {"profile_image": upload, "full_name": "New"}, format="multipart")
        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertFalse(user.profile_image)
        self.assertEqual(user.full_name, "New")  # other fields still editable


class UploadMetadataTests(APITestCase):
    def _jpeg_with_gps(self):
        image = Image.new("RGB", (60, 30), color=(200, 30, 30))
        exif = Image.Exif()
        exif[0x0112] = 6  # Orientation: rotate 90° CW to display
        exif[0x8825] = {1: "N", 2: (12.0, 58.0, 0.0), 3: "E", 4: (77.0, 35.0, 0.0)}  # GPS IFD
        buffer = BytesIO()
        image.save(buffer, format="JPEG", exif=exif)
        return SimpleUploadedFile("phone.jpg", buffer.getvalue(), content_type="image/jpeg")

    def test_gps_and_exif_are_removed_and_orientation_applied(self):
        self.client.force_authenticate(make_user("m@example.com"))
        response = self.client.post("/api/v1/media/", {"file": self._jpeg_with_gps()}, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        # Orientation 6 was applied to the pixels, so width/height swapped.
        self.assertEqual((response.data["width"], response.data["height"]), (30, 60))
        from media_manager.models import MediaAsset

        asset = MediaAsset.objects.get(pk=response.data["id"])
        with Image.open(asset.file.path) as stored:
            self.assertEqual(stored.format, "JPEG")
            self.assertEqual(len(stored.getexif()), 0)
            self.assertNotIn(0x8825, stored.getexif())
        self.assertEqual(asset.file_size, asset.file.size)


class PasswordResetBrokerTests(APITestCase):
    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_only_the_user_id_is_queued_and_the_email_still_has_a_link(self):
        user = make_user("r@example.com")
        with patch("accounts.tasks.send_password_reset_email.delay") as delay:
            self.client.post("/api/v1/auth/password/forgot/", {"email": user.email}, format="json")
        delay.assert_called_once_with(str(user.pk))

        from accounts.tasks import send_password_reset_email

        send_password_reset_email(str(user.pk))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/reset-password?uid=", mail.outbox[0].body)


class NotificationRetryTests(TestCase):
    def setUp(self):
        from notifications.models import Notification

        self.user = make_user("n@example.com")
        self.notification = Notification.objects.create(user=self.user, category="SYSTEM", title="T", message="M")

    def _run(self, exc):
        from notifications.tasks import send_notification_email

        with patch("notifications.tasks.send_mail", side_effect=exc), patch.object(
            send_notification_email, "retry", side_effect=RuntimeError("retry scheduled")
        ) as retry:
            try:
                result = send_notification_email(str(self.notification.pk))
            except RuntimeError:
                result = "retried"
        self.notification.refresh_from_db()
        return result, retry.called

    def test_permanent_rejection_is_not_retried(self):
        exc = smtplib.SMTPRecipientsRefused({"n@example.com": (550, b"No such user")})
        result, retried = self._run(exc)
        self.assertEqual(result, {"status": "failed_permanent"})
        self.assertFalse(retried)
        self.assertEqual(self.notification.email_status, "FAILED")

    def test_temporary_failure_is_retried(self):
        result, retried = self._run(smtplib.SMTPServerDisconnected("Connection unexpectedly closed"))
        self.assertEqual(result, "retried")
        self.assertTrue(retried)


class CeleryReliabilitySettingsTests(TestCase):
    def test_late_ack_and_limits_with_at_most_once_diamond_sends(self):
        from config.celery import app
        from guests.tasks import send_diamond_invites

        self.assertTrue(app.conf.task_acks_late)
        self.assertEqual(app.conf.worker_prefetch_multiplier, 1)
        self.assertTrue(app.conf.task_soft_time_limit and app.conf.task_time_limit)
        self.assertFalse(send_diamond_invites.acks_late)
        self.assertGreater(app.conf.broker_transport_options["visibility_timeout"], send_diamond_invites.time_limit)


class RequestTimeExpiryTests(APITestCase):
    def _subscription(self, user, ends_at):
        from subscriptions.models import PlanCode, Subscription, SubscriptionPlan

        plan, _ = SubscriptionPlan.objects.get_or_create(
            code=PlanCode.GOLD, defaults={"name": "Gold", "amount": 29900, "currency": "INR", "duration_days": 30}
        )
        return Subscription.objects.create(
            user=user, plan=plan, status=Subscription.Status.ACTIVE,
            starts_at=ends_at - timedelta(days=30), ends_at=ends_at,
        )

    def _me(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken

        from accounts.tokens import PASSWORD_VERSION_CLAIM, password_version

        # A real access token (as issued at login) so the request goes through
        # the authentication class where the expiry check lives.
        access = RefreshToken.for_user(user).access_token
        access[PASSWORD_VERSION_CLAIM] = password_version(user)
        return self.client.get("/api/v1/users/me/", HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_lapsed_plan_is_downgraded_on_next_request(self):
        user = make_user("x@example.com", SubscriptionTier.GOLD)
        subscription = self._subscription(user, timezone.now() - timedelta(hours=1))
        response = self._me(user)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["subscription_tier"], "NORMAL")
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, "EXPIRED")

    def test_running_plan_is_untouched(self):
        user = make_user("y@example.com", SubscriptionTier.GOLD)
        self._subscription(user, timezone.now() + timedelta(days=5))
        self.assertEqual(self._me(user).data["data"]["subscription_tier"], "GOLD")

    def test_admin_granted_tier_without_subscription_is_kept(self):
        user = make_user("z@example.com", SubscriptionTier.DIAMOND)
        self.assertEqual(self._me(user).data["data"]["subscription_tier"], "DIAMOND")
