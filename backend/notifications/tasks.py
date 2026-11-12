import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, name="notifications.send_notification_email")
def send_notification_email(self, notification_id):
    """Deliver a notification email; failures are recorded and retried."""
    try:
        notification = Notification.objects.select_related("user").get(pk=notification_id)
    except Notification.DoesNotExist:
        logger.warning("Notification %s no longer exists; email skipped", notification_id)
        return {"status": "missing"}

    if notification.email_status == Notification.EmailStatus.SENT:
        return {"status": "already_sent"}
    if notification.email_status == Notification.EmailStatus.SKIPPED:
        return {"status": "skipped"}
    preference = NotificationPreference.objects.filter(user=notification.user).first()
    if preference and not preference.allows(notification.category):
        notification.email_status = Notification.EmailStatus.SKIPPED
        notification.save(update_fields=["email_status"])
        return {"status": "skipped_by_preference"}
    if not notification.user.email:
        notification.email_status = Notification.EmailStatus.SKIPPED
        notification.save(update_fields=["email_status"])
        return {"status": "skipped"}

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    action = f"\n\nOpen NexaInvite: {frontend_url}{notification.action_url}" if notification.action_url else ""
    body = f"Hello {notification.user.full_name or notification.user.email},\n\n{notification.message}{action}\n\nYou received this email because email notifications are enabled in your NexaInvite preferences."
    try:
        sent = send_mail(
            subject=f"NexaInvite: {notification.title}",
            message=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[notification.user.email],
            fail_silently=False,
        )
        if sent:
            notification.email_status = Notification.EmailStatus.SENT
            notification.email_sent_at = timezone.now()
            notification.email_error = ""
            notification.save(update_fields=["email_status", "email_sent_at", "email_error"])
            return {"status": "sent"}
        raise RuntimeError("Email backend did not accept the message.")
    except Exception as exc:
        notification.email_status = Notification.EmailStatus.FAILED
        notification.email_error = f"{type(exc).__name__}: {exc}"[:2000]
        notification.save(update_fields=["email_status", "email_error"])
        logger.exception("Notification email failed for %s", notification_id)
        raise self.retry(exc=exc)
