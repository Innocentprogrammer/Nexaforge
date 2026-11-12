from datetime import timedelta

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .models import Subscription


@shared_task(name="subscriptions.tasks.expire_subscriptions")
def expire_subscriptions():
    """Expire ended paid subscriptions and restore the user's free Normal tier."""
    now = timezone.now()
    expired_ids = []
    expired_rows = []
    with transaction.atomic():
        subscriptions = list(
            Subscription.objects.select_for_update()
            .filter(status=Subscription.Status.ACTIVE, ends_at__lte=now)
            .select_related("user", "plan")
        )
        for subscription in subscriptions:
            subscription.status = Subscription.Status.EXPIRED
            subscription.save(update_fields=["status", "updated_at"])
            has_other_active = Subscription.objects.filter(
                user=subscription.user,
                status=Subscription.Status.ACTIVE,
                ends_at__gt=now,
            ).exclude(pk=subscription.pk).exists()
            if not has_other_active:
                subscription.user.subscription_tier = "NORMAL"
                subscription.user.save(update_fields=["subscription_tier", "updated_at"])
            expired_ids.append(str(subscription.pk))
            expired_rows.append(subscription)

    from notifications.services import create_notification
    for subscription in expired_rows:
        create_notification(
            user=subscription.user,
            category="BILLING",
            title="Your subscription has expired",
            message=f"Your {subscription.plan.name} plan has expired. Review plans to restore premium features.",
            action_url="/dashboard/billing",
            metadata={"subscription_id": str(subscription.pk), "event": "SUBSCRIPTION_EXPIRED"},
        )
    return expired_ids


@shared_task(name="subscriptions.tasks.send_subscription_expiry_reminders")
def send_subscription_expiry_reminders():
    """Send one reminder three days before an active subscription ends."""
    reminder_date = timezone.localdate() + timedelta(days=3)
    subscriptions = Subscription.objects.filter(
        status=Subscription.Status.ACTIVE,
        ends_at__date=reminder_date,
    ).select_related("user", "plan")

    from notifications.models import Notification
    from notifications.services import create_notification

    sent = 0
    for subscription in subscriptions:
        already_sent = Notification.objects.filter(
            user=subscription.user,
            category=Notification.Category.BILLING,
            metadata__subscription_id=str(subscription.pk),
            metadata__event="SUBSCRIPTION_EXPIRY_REMINDER",
        ).exists()
        if already_sent:
            continue
        create_notification(
            user=subscription.user,
            category=Notification.Category.BILLING,
            title="Your subscription expires in 3 days",
            message=f"Your {subscription.plan.name} plan ends on {subscription.ends_at:%d %b %Y}. Renew or change your plan from billing settings.",
            action_url="/dashboard/billing",
            metadata={"subscription_id": str(subscription.pk), "event": "SUBSCRIPTION_EXPIRY_REMINDER"},
        )
        sent += 1
    return {"reminders_created": sent}
