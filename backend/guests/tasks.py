import logging
import time

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string
from django.utils import timezone

from .models import Guest, InviteSendLog
from .senders import SendResult, get_sender

logger = logging.getLogger(__name__)


@shared_task(name="guests.send_diamond_invites")
def send_diamond_invites(invitation_id, guest_ids=None):
    """Deliver each guest's unique invite link over WhatsApp, or SMS.

    Per guest: try WhatsApp first. If Twilio reports the number is not reachable
    on WhatsApp (see WHATSAPP_UNREACHABLE_CODES in senders.py), retry the same
    message over SMS. A WhatsApp success does NOT also send an SMS unless
    ``INVITE_SEND_DUPLICATE_SMS`` is explicitly turned on — double delivery
    doubles cost and message volume for guests who are already on WhatsApp.

    Sends are sequential with a delay between them rather than fired
    concurrently, to stay inside Twilio's per-account rate limit.

    Guests with an email address also get the same link by email, recorded on
    the log row's ``email_status``. A guest counts as sent when either the
    email or the WhatsApp/SMS message got through.

    :param guest_ids: restrict the batch to these guests. The Diamond CSV import
        passes the ids that survived its format check and phone de-duplication,
        so an excluded row never reaches this task at all — it gets no send and
        no InviteSendLog row, rather than a row with a failed status. Omit to
        target every guest on the invitation (the manual re-send endpoint).
        Tier itself is no longer checked here: it lives on the host account and
        is enforced by the endpoint's permission class before enqueueing.
    """
    queryset = Guest.objects.filter(invitation_id=invitation_id)
    if guest_ids is not None:
        queryset = queryset.filter(id__in=list(guest_ids))
    guests = list(queryset.select_related("invitation__user").order_by("full_name"))
    if not guests:
        return {"invitation_id": str(invitation_id), "attempted": 0, "sent": 0, "failed": 0}

    try:
        sender = get_sender()
    except Exception as exc:
        # Misconfiguration (e.g. INVITE_SEND_BACKEND=twilio with empty
        # credentials) must not kill the task silently — that would leave the
        # status table stuck on PENDING with nothing explaining why. Record the
        # reason against every guest so it surfaces in the UI.
        logger.exception("Could not build the invite sender")
        InviteSendLog.objects.bulk_create(
            [
                InviteSendLog(
                    guest=guest,
                    status=InviteSendLog.Status.FAILED,
                    provider_error=str(exc),
                )
                for guest in guests
            ]
        )
        from notifications.services import create_notification
        create_notification(
            user=guests[0].invitation.user,
            category="INVITATION",
            title="Invitation delivery could not start",
            message=f"We could not start delivery for {guests[0].invitation.title}. Check the messaging provider configuration and try again.",
            action_url=f"/invitations/{invitation_id}/guests",
            metadata={"invitation_id": str(invitation_id), "event": "DELIVERY_SETUP_FAILED"},
        )
        return {
            "invitation_id": str(invitation_id),
            "attempted": len(guests),
            "sent": 0,
            "failed": len(guests),
            "error": str(exc),
        }

    delay = settings.INVITE_SEND_DELAY_SECONDS
    sent = failed = 0
    #: WhatsApp sends Twilio accepted but hasn't resolved yet — reconciled below.
    pending_confirmation: list[tuple[InviteSendLog, Guest, str]] = []
    #: Guests whose email copy was accepted — they count as reached even if the
    #: WhatsApp/SMS leg later fails.
    email_ok: set = set()
    email_connection = None

    for index, guest in enumerate(guests):
        log = InviteSendLog.objects.create(guest=guest, status=InviteSendLog.Status.PENDING)

        if guest.email:
            if email_connection is None:
                # One SMTP connection for the whole batch instead of a login per guest.
                email_connection = get_connection(fail_silently=False)
            email_error = _send_invite_email(guest, email_connection)
            log.email_status = (
                InviteSendLog.Status.FAILED if email_error else InviteSendLog.Status.SENT
            )
            log.email_error = email_error
            log.save(update_fields=["email_status", "email_error", "updated_at"])
            if not email_error:
                email_ok.add(guest.pk)

        if not guest.phone_number:
            reached = guest.pk in email_ok
            log.status = InviteSendLog.Status.SENT if reached else InviteSendLog.Status.FAILED
            log.provider_error = (
                "No phone number; sent by email only." if reached else "Guest has no phone number."
            )
            log.save(update_fields=["status", "provider_error", "updated_at"])
            if reached:
                sent += 1
                _mark_sent(guest)
            else:
                failed += 1
            continue

        if index:
            time.sleep(delay)

        url = guest.unique_invite_url
        whatsapp_available = getattr(sender, "whatsapp_enabled", True)
        channel = (
            InviteSendLog.Channel.WHATSAPP if whatsapp_available else InviteSendLog.Channel.SMS
        )
        try:
            if not whatsapp_available:
                # No WhatsApp sender configured on this account — go straight to
                # SMS rather than failing every guest on a channel that cannot
                # work. This is an explicit config choice, not a masked error.
                result = sender.send_sms(guest.phone_number, url, guest.full_name)
            else:
                result = sender.send_whatsapp(guest.phone_number, url, guest.full_name)

                if result.ok:
                    # Delivery is not yet known — 63015/63024 arrive after
                    # create() returns. Queue it for the reconcile pass below
                    # instead of waiting here, so all the sends go out first and
                    # their statuses settle in parallel.
                    pending_confirmation.append((log, guest, url))
                elif result.unreachable_on_whatsapp:
                    logger.info(
                        "WhatsApp unreachable for guest %s (code %s), falling back to SMS",
                        guest.pk,
                        result.error_code,
                    )
                    time.sleep(delay)
                    result = sender.send_sms(guest.phone_number, url, guest.full_name)
                    channel = InviteSendLog.Channel.SMS
        except Exception as exc:
            # An unexpected provider/network error on one guest must not abort
            # the batch and strand the remaining guests on PENDING.
            logger.exception("Send failed for guest %s", guest.pk)
            result = SendResult(ok=False, error_message=f"{type(exc).__name__}: {exc}")

        _write_log(log, channel, result)

        if result.ok or guest.pk in email_ok:
            sent += 1
            _mark_sent(guest)
        else:
            failed += 1

    # ---- Reconcile pass -----------------------------------------------------
    # Every WhatsApp message is now in flight. Check what actually happened and,
    # where WhatsApp couldn't reach the guest, deliver by SMS instead. Doing this
    # after the whole batch (rather than per guest) lets the statuses settle in
    # parallel, which keeps the task fast enough to run inline in the request.
    for log, guest, url in pending_confirmation:
        try:
            confirmed = sender.confirm_delivery(log.provider_message_id)
        except Exception:
            logger.exception("Confirmation failed for guest %s", guest.pk)
            continue
        if confirmed is None or confirmed.ok:
            if confirmed is not None and confirmed.ok and settings.INVITE_SEND_DUPLICATE_SMS:
                # Off by default — doubles cost and volume for guests already
                # reached on WhatsApp. Only meaningful once delivery is confirmed.
                time.sleep(delay)
                sender.send_sms(guest.phone_number, url, guest.full_name)
            continue  # still in flight, or genuinely delivered — leave as SENT

        result = confirmed
        channel = InviteSendLog.Channel.WHATSAPP
        if confirmed.unreachable_on_whatsapp:
            logger.info(
                "WhatsApp undeliverable for guest %s (code %s), falling back to SMS",
                guest.pk,
                confirmed.error_code,
            )
            time.sleep(delay)
            try:
                result = sender.send_sms(guest.phone_number, url, guest.full_name)
                channel = InviteSendLog.Channel.SMS
            except Exception as exc:
                result = SendResult(ok=False, error_message=f"{type(exc).__name__}: {exc}")
                channel = InviteSendLog.Channel.SMS

        _write_log(log, channel, result)
        # This guest was counted as sent during the first pass. Correct that
        # only if neither the fallback nor the email copy reached them.
        if not result.ok and guest.pk not in email_ok:
            sent -= 1
            failed += 1
            if guest.invitation_sent:
                guest.invitation_sent = False
                guest.save(update_fields=["invitation_sent"])

    if email_connection is not None:
        try:
            email_connection.close()
        except Exception:
            logger.warning("Could not close the invite email connection", exc_info=True)

    invitation = guests[0].invitation
    from notifications.services import create_notification
    create_notification(
        user=invitation.user,
        category="INVITATION",
        title="Invitation delivery report",
        message=f"Delivery finished for {invitation.title}: {sent} sent and {failed} failed out of {len(guests)} guests.",
        action_url=f"/invitations/{invitation.pk}/guests",
        metadata={"invitation_id": str(invitation.pk), "event": "DELIVERY_COMPLETE", "attempted": len(guests), "sent": sent, "failed": failed},
    )
    return {
        "invitation_id": str(invitation_id),
        "attempted": len(guests),
        "sent": sent,
        "failed": failed,
    }


def _write_log(log, channel, result) -> None:
    log.channel = channel
    log.status = InviteSendLog.Status.SENT if result.ok else InviteSendLog.Status.FAILED
    log.provider_message_id = result.message_id
    log.provider_error = "" if result.ok else _error_text(result)
    log.save(
        update_fields=[
            "channel",
            "status",
            "provider_message_id",
            "provider_error",
            "updated_at",
        ]
    )


def _error_text(result) -> str:
    if result.error_code:
        return f"[{result.error_code}] {result.error_message}"
    return result.error_message or "Send failed."


def _mark_sent(guest) -> None:
    if not guest.invitation_sent:
        guest.invitation_sent = True
        guest.save(update_fields=["invitation_sent"])


def _send_invite_email(guest, connection) -> str:
    """Email the guest their personal invite link. Returns "" on success, else the error."""
    invitation = guest.invitation
    host = invitation.user
    context = {
        "guest_name": guest.full_name,
        "title": invitation.title,
        "host_name": getattr(host, "full_name", "") or "",
        "event_date": (
            timezone.localtime(invitation.event_date).strftime("%A, %d %B %Y, %I:%M %p")
            if invitation.event_date
            else ""
        ),
        "venue": invitation.venue,
        "invite_url": guest.unique_invite_url,
    }
    message = EmailMultiAlternatives(
        subject=f"You're invited: {invitation.title}",
        body=render_to_string("guests/emails/invite.txt", context),
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        to=[guest.email],
        connection=connection,
    )
    message.attach_alternative(render_to_string("guests/emails/invite.html", context), "text/html")
    try:
        message.send(fail_silently=False)
    except Exception as exc:
        # One bad address or a dropped SMTP session must not abort the batch.
        logger.exception("Invite email failed for guest %s", guest.pk)
        return f"{type(exc).__name__}: {exc}"[:2000]
    return ""
