import logging

from django.db import transaction

from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)


def create_notification(
    *,
    user,
    category: str,
    title: str,
    message: str,
    action_url: str = "",
    metadata: dict | None = None,
    send_email: bool = True,
):
    """Persist an in-app notification and enqueue email only when opted in.

    This function is safe to call from inside a database transaction. Email is
    queued only after the transaction commits, so a worker cannot race an
    uncommitted notification row.
    """
    notification = Notification.objects.create(
        user=user,
        category=category,
        title=title,
        message=message,
        action_url=action_url,
        metadata=metadata or {},
    )

    if not send_email:
        notification.email_status = Notification.EmailStatus.SKIPPED
        notification.save(update_fields=["email_status"])
        return notification

    preference, _ = NotificationPreference.objects.get_or_create(user=user)
    if not user.email or not preference.allows(category):
        notification.email_status = Notification.EmailStatus.SKIPPED
        notification.save(update_fields=["email_status"])
        return notification

    notification.email_status = Notification.EmailStatus.PENDING
    notification.save(update_fields=["email_status"])

    def enqueue_email():
        try:
            from .tasks import send_notification_email

            send_notification_email.delay(str(notification.pk))
        except Exception:
            logger.exception("Could not enqueue notification email %s", notification.pk)
            Notification.objects.filter(pk=notification.pk).update(
                email_status=Notification.EmailStatus.FAILED,
                email_error="Could not enqueue email delivery.",
            )

    transaction.on_commit(enqueue_email)
    return notification
