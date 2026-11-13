"""Platform-wide activity log.

One helper, :func:`log_activity`, used by every app to record what happened —
user actions (register, login, invitation and guest changes), billing events
(payments, webhooks, subscription expiry) and admin actions. Rows land in
:class:`~admin_portal.models.AdminActivityLog` and are shown on the admin
portal's Activity log tab.

Logging is best-effort by design: a failure to write an activity row is logged
and swallowed, never raised, so it can't break the business action it
describes (a payment, a registration…). It runs in its own savepoint so a
failed insert can't poison an enclosing transaction either.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from ipaddress import ip_address as parse_ip

from django.db import transaction
from django.utils import timezone

from .models import AdminActivityLog

logger = logging.getLogger(__name__)


class Action:
    """Action codes. Kept as plain strings so existing rows stay valid."""

    # Accounts
    USER_REGISTERED = "USER_REGISTERED"
    USER_LOGIN = "USER_LOGIN"
    USER_LOGIN_FAILED = "USER_LOGIN_FAILED"
    USER_LOGOUT = "USER_LOGOUT"
    PROFILE_UPDATED = "PROFILE_UPDATED"
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED"
    PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED"
    # Invitations
    INVITATION_CREATED = "INVITATION_CREATED"
    INVITATION_UPDATED = "INVITATION_UPDATED"
    INVITATION_PUBLISHED = "INVITATION_PUBLISHED"
    INVITATION_DUPLICATED = "INVITATION_DUPLICATED"
    INVITATION_DELETED = "INVITATION_DELETED"
    # Guests
    GUEST_ADDED = "GUEST_ADDED"
    GUEST_UPDATED = "GUEST_UPDATED"
    GUEST_DELETED = "GUEST_DELETED"
    GUESTS_IMPORTED = "GUESTS_IMPORTED"
    INVITES_SENT = "INVITES_SENT"
    # Billing
    PAYMENT_ORDER_CREATED = "PAYMENT_ORDER_CREATED"
    PAYMENT_CAPTURED = "PAYMENT_CAPTURED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    SUBSCRIPTION_ACTIVATED = "SUBSCRIPTION_ACTIVATED"
    SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED"


def client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
    raw_ip = forwarded or request.META.get("REMOTE_ADDR")
    try:
        return str(parse_ip(raw_ip)) if raw_ip else None
    except ValueError:
        return None


def log_activity(
    action: str,
    *,
    actor=None,
    request=None,
    target=None,
    target_type: str = "",
    target_id: str = "",
    summary: str = "",
    metadata: dict | None = None,
) -> AdminActivityLog | None:
    """Record one activity row. Never raises.

    ``actor`` defaults to the authenticated ``request.user``; pass it
    explicitly for events with no request (Celery tasks) or where the user is
    only known after the fact (registration, login). ``actor=None`` with no
    authenticated request is shown as "System".

    ``target`` is any model instance; its class name and pk fill
    ``target_type`` / ``target_id`` unless those are given.
    """
    try:
        if actor is None and request is not None:
            user = getattr(request, "user", None)
            if user is not None and user.is_authenticated:
                actor = user
        if target is not None:
            target_type = target_type or type(target).__name__
            target_id = target_id or str(target.pk)
        with transaction.atomic():
            return AdminActivityLog.objects.create(
                actor=actor,
                action=action,
                target_type=target_type[:80],
                target_id=str(target_id)[:80],
                summary=(summary or action)[:255],
                metadata=metadata or {},
                ip_address=client_ip(request),
            )
    except Exception:  # noqa: BLE001 — logging must never break the caller
        logger.exception("Could not record activity %s", action)
        return None


def recently_logged(action: str, *, actor, target_id: str, within: timedelta) -> bool:
    """True if the same actor logged `action` on `target_id` within `within`.

    Used to keep high-frequency events (the editor autosaves an invitation every
    30 seconds) to one row per editing session instead of hundreds.
    """
    return AdminActivityLog.objects.filter(
        action=action,
        actor=actor,
        target_id=str(target_id),
        created_at__gte=timezone.now() - within,
    ).exists()
