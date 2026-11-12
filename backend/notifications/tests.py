from rest_framework import status
from django.core import mail
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import User

from .models import Notification, NotificationPreference
from .services import create_notification
from .tasks import send_notification_email


class NotificationAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="notify@example.com",
            email="notify@example.com",
            password="StrongPassword!2026",
            full_name="Notify User",
        )
        self.other_user = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="StrongPassword!2026",
        )
        self.notification = Notification.objects.create(
            user=self.user,
            category=Notification.Category.RSVP,
            title="New RSVP received",
            message="A guest responded to your invitation.",
            action_url="/dashboard",
        )
        Notification.objects.create(
            user=self.other_user,
            category=Notification.Category.ACCOUNT,
            title="Private notification",
            message="This belongs to another user.",
        )
        self.client.force_authenticate(user=self.user)

    def test_list_only_returns_current_users_notifications(self):
        response = self.client.get("/api/v1/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "New RSVP received")

    def test_unread_count_is_user_scoped(self):
        response = self.client.get("/api/v1/notifications/unread-count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["unread_count"], 1)

    def test_user_can_mark_own_notification_read(self):
        response = self.client.patch(f"/api/v1/notifications/{self.notification.pk}/read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)
        self.assertIsNotNone(self.notification.read_at)

    def test_user_cannot_mark_another_users_notification_read(self):
        other_notification = Notification.objects.get(user=self.other_user)
        response = self.client.patch(f"/api/v1/notifications/{other_notification.pk}/read/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_read_only_updates_current_user(self):
        response = self.client.post("/api/v1/notifications/read-all/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["updated"], 1)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)
        self.assertTrue(Notification.objects.filter(user=self.other_user, is_read=False).exists())

    def test_preferences_can_be_read_and_updated(self):
        response = self.client.get("/api/v1/notifications/preferences/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["data"]["email_enabled"])

        response = self.client.patch(
            "/api/v1/notifications/preferences/",
            {"email_rsvp": False, "email_billing": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        preference = NotificationPreference.objects.get(user=self.user)
        self.assertFalse(preference.email_rsvp)
        self.assertFalse(preference.email_billing)
        self.assertTrue(preference.email_account)

    def test_notification_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)
        for path in (
            "/api/v1/notifications/",
            "/api/v1/notifications/unread-count/",
            "/api/v1/notifications/preferences/",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, status.HTTP_401_UNAUTHORIZED)


class NotificationServiceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="service@example.com",
            email="service@example.com",
            password="StrongPassword!2026",
            full_name="Service User",
        )

    def test_notification_is_created_even_when_email_is_disabled(self):
        NotificationPreference.objects.create(user=self.user, email_enabled=False)
        notification = create_notification(
            user=self.user,
            category=Notification.Category.RSVP,
            title="RSVP update",
            message="A guest responded.",
        )
        self.assertTrue(Notification.objects.filter(pk=notification.pk, user=self.user).exists())
        self.assertEqual(notification.email_status, Notification.EmailStatus.SKIPPED)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="NexaInvite <no-reply@example.com>",
        FRONTEND_URL="https://app.example.com",
    )
    def test_email_task_sends_and_records_delivery(self):
        notification = Notification.objects.create(
            user=self.user,
            category=Notification.Category.ACCOUNT,
            title="Welcome",
            message="Your account is ready.",
            action_url="/dashboard",
            email_status=Notification.EmailStatus.PENDING,
        )
        result = send_notification_email.run(str(notification.pk))
        notification.refresh_from_db()
        self.assertEqual(result["status"], "sent")
        self.assertEqual(notification.email_status, Notification.EmailStatus.SENT)
        self.assertIsNotNone(notification.email_sent_at)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("https://app.example.com/dashboard", mail.outbox[0].body)
