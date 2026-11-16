import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from .models import User
from .serializers import make_reset_params

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="accounts.send_password_reset_email",
    max_retries=3,
    default_retry_delay=30,
)
def send_password_reset_email(self, user_id: str, reset_url: str | None = None):
    """Send the password reset link. Transactional: ignores notification
    preferences — a user who turned emails off still needs to recover access."""
    user = User.objects.filter(pk=user_id, is_active=True).first()
    if user is None or not user.email:
        return {"status": "skipped"}

    if reset_url is None:
        # Normal path. (A reset_url argument is still accepted so any message
        # queued by the previous version of this task can drain safely.)
        reset_url = build_reset_url(user)
    context = {
        "name": user.full_name or user.email,
        "email": user.email,
        "reset_url": reset_url,
        "expiry_minutes": settings.PASSWORD_RESET_TIMEOUT // 60,
    }
    message = EmailMultiAlternatives(
        subject="Reset your NexaInvite password",
        body=render_to_string("accounts/emails/password_reset.txt", context),
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        to=[user.email],
    )
    message.attach_alternative(render_to_string("accounts/emails/password_reset.html", context), "text/html")
    try:
        message.send(fail_silently=False)
    except Exception as exc:
        # Never log the link itself: it is a credential until it expires.
        logger.exception("Password reset email to user %s failed", user_id)
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))
    return {"status": "sent"}


def build_reset_url(user) -> str:
    uid, token = make_reset_params(user)
    return f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
