"""Outbound WhatsApp/SMS delivery for diamond-tier invites.

Two backends, chosen by ``settings.INVITE_SEND_BACKEND``:

* ``twilio``  - real sends through the Twilio REST API.
* ``console`` - logs the payload and returns a simulated result. This is the
  default for local dev and is what the end-to-end test runs against, so no
  live credentials (or spend) are needed to exercise the whole flow.
"""

import logging
from dataclasses import dataclass, field

from django.conf import settings

logger = logging.getLogger(__name__)

# Twilio error codes meaning "this number can't receive WhatsApp" — i.e. the
# cases where falling back to SMS is the right move. Verified against Twilio's
# error dictionary rather than assumed:
#
#   63003 "Channel could not find To address" — Twilio could not validate the To
#         address for the channel; the docs give "an unregistered WhatsApp
#         number" as an explicit cause.
#         https://www.twilio.com/docs/api/errors/63003
#   63024 "Invalid message recipient" — Meta identifies the recipient as an
#         invalid WhatsApp user: number not enabled for WhatsApp, recipient has
#         not accepted WhatsApp's ToS, or an unsupported client version.
#         https://www.twilio.com/docs/api/errors/63024
#
# Deliberately excluded: 63013 (channel policy / content violation) and 63016
# (freeform message outside the 24h session window) both describe a problem with
# the *message*, not with the number's reachability, so retrying the same content
# over SMS would paper over a real error. 63016 should not arise here anyway —
# these sends use an approved template (content SID).
#   63015 "Channel Sandbox can only send messages to phone numbers that have
#         joined the sandbox" — the recipient has not sent "join <code>", joined
#         a different sandbox, or their enrolment lapsed (it expires after three
#         days). Recipient-side reachability like the two above, so SMS is the
#         right fallback. This one disappears once you move off the sandbox onto
#         an approved WhatsApp sender.
#         https://www.twilio.com/docs/api/errors/63015
WHATSAPP_UNREACHABLE_CODES = frozenset({63003, 63015, 63024})


@dataclass
class SendResult:
    ok: bool
    message_id: str = ""
    error_code: int | None = None
    error_message: str = ""
    #: True when the failure specifically means "not reachable on WhatsApp".
    unreachable_on_whatsapp: bool = field(default=False)


# Sender-side configuration errors. These are NOT reachability problems, so they
# must not trigger the SMS fallback — retrying over SMS would hide a broken
# setup. They get a clearer message than the raw Twilio text instead.
CONFIG_ERROR_HINTS = {
    63007: (
        "the 'from' address is not a WhatsApp sender on this account. Use the "
        "sandbox number (whatsapp:+14155238886) or an approved WhatsApp sender; "
        "an ordinary SMS number cannot send WhatsApp."
    ),
    63018: "rate limit exceeded for this WhatsApp sender.",
    21606: "the 'from' number is not SMS-capable or not owned by this account.",
    21608: "trial account: the recipient number is not verified in the Twilio console.",
}


# Twilio message statuses. WhatsApp goes queued -> sent -> delivered -> read, or
# queued -> failed. "sent" only means handed off, so it is NOT yet a success.
TERMINAL_SUCCESS = frozenset({"delivered", "read"})
TERMINAL_FAILURE = frozenset({"failed", "undelivered"})


class ConsoleSender:
    """Simulated backend — no network calls, no spend."""

    whatsapp_enabled = True

    def confirm_delivery(self, message_id: str) -> SendResult | None:
        # Simulated sends are decided at send time; nothing to reconcile.
        return None

    def __init__(self):
        # Numbers listed here simulate a WhatsApp-unreachable recipient (63003),
        # which is how the SMS-fallback path gets exercised without live Twilio.
        raw = getattr(settings, "INVITE_SEND_CONSOLE_UNREACHABLE", "") or ""
        self.unreachable = {n.strip() for n in raw.split(",") if n.strip()}

    def send_whatsapp(self, to: str, invite_url: str, guest_name: str) -> SendResult:
        if to in self.unreachable:
            logger.info("[console] WhatsApp to %s simulated as unreachable", to)
            return SendResult(
                ok=False,
                error_code=63003,
                error_message="Channel could not find To address (simulated)",
                unreachable_on_whatsapp=True,
            )
        logger.info("[console] WhatsApp to %s (%s): %s", to, guest_name, invite_url)
        return SendResult(ok=True, message_id=f"console-wa-{to}")

    def send_sms(self, to: str, invite_url: str, guest_name: str) -> SendResult:
        logger.info("[console] SMS to %s (%s): %s", to, guest_name, invite_url)
        return SendResult(ok=True, message_id=f"console-sms-{to}")


class TwilioSender:
    def __init__(self):
        from twilio.rest import Client

        # WhatsApp is optional: with no WhatsApp sender configured the task goes
        # straight to SMS rather than failing every guest on a channel this
        # account can't use.
        self.whatsapp_enabled = bool(getattr(settings, "TWILIO_WHATSAPP_FROM", ""))

        missing = [
            name
            for name in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN")
            if not getattr(settings, name, "")
        ]
        if not self.whatsapp_enabled and not getattr(settings, "TWILIO_SMS_FROM", ""):
            missing.append("TWILIO_WHATSAPP_FROM or TWILIO_SMS_FROM")
        if missing:
            raise RuntimeError(
                "Twilio send backend selected but these settings are empty: "
                + ", ".join(missing)
                + ". Set the matching NEXAINVITE_TWILIO_* variables in backend/.env "
                "(see .env.example)."
            )
        self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    def _create(self, **kwargs) -> SendResult:
        from twilio.base.exceptions import TwilioRestException

        try:
            message = self.client.messages.create(**kwargs)
        except TwilioRestException as exc:
            return SendResult(
                ok=False,
                error_code=exc.code,
                error_message=_describe(exc.code, exc.msg or str(exc)),
                unreachable_on_whatsapp=exc.code in WHATSAPP_UNREACHABLE_CODES,
            )

        # A message can also come back already failed rather than raising.
        error_code = getattr(message, "error_code", None)
        if message.status == "failed" or error_code:
            return SendResult(
                ok=False,
                message_id=message.sid or "",
                error_code=error_code,
                error_message=getattr(message, "error_message", "") or "Message failed",
                unreachable_on_whatsapp=error_code in WHATSAPP_UNREACHABLE_CODES,
            )
        return SendResult(ok=True, message_id=message.sid or "")

    def send_whatsapp(self, to: str, invite_url: str, guest_name: str) -> SendResult:
        # The sender must carry the channel prefix. Adding it here as well as
        # documenting it in .env: a bare number here fails with a confusing
        # error, and it is an easy thing to drop when editing config by hand.
        sender = settings.TWILIO_WHATSAPP_FROM
        if not sender.startswith("whatsapp:"):
            sender = f"whatsapp:{sender}"

        kwargs = {"from_": sender, "to": f"whatsapp:{to}"}

        template_sid = (settings.TWILIO_TEMPLATE_SID or "").strip()
        if template_sid.startswith("HX"):
            # Approved template — required to open a conversation outside the
            # 24-hour session window.
            kwargs["content_sid"] = template_sid
            kwargs["content_variables"] = _template_variables(guest_name, invite_url)
        else:
            if template_sid:
                # Someone pasted the message *text* into the SID setting. Sending
                # it as content_sid gets a bare "20422 Invalid Parameter" from
                # Twilio, which is impossible to diagnose from the UI — ignore it
                # and use the plain body instead.
                logger.warning(
                    "NEXAINVITE_TWILIO_TEMPLATE_SID is not a Content SID (must start "
                    "with 'HX'); got %r. Ignoring it and sending a plain body. Register "
                    "the template with Twilio and use the HX... id it gives you.",
                    template_sid[:40] + ("…" if len(template_sid) > 40 else ""),
                )
            kwargs["body"] = _plain_body(guest_name, invite_url)
        return self._create(**kwargs)

    def confirm_delivery(self, message_id: str) -> SendResult | None:
        """Wait for a message to reach a terminal state and report the outcome.

        Twilio accepts a WhatsApp message before it knows whether it can be
        delivered: 63015 ("recipient has not joined the sandbox") and 63024
        arrive *after* messages.create() has already returned success. Without
        this step the task records SENT for a message that later fails, and the
        SMS fallback never runs.

        Returns None if the message is still in flight when we stop waiting — in
        that case the caller keeps the optimistic result rather than risking a
        duplicate send to someone whose message is merely slow.
        """
        import time

        attempts = getattr(settings, "INVITE_SEND_CONFIRM_ATTEMPTS", 6)
        interval = getattr(settings, "INVITE_SEND_CONFIRM_INTERVAL", 2.0)

        for _ in range(attempts):
            time.sleep(interval)
            try:
                message = self.client.messages(message_id).fetch()
            except Exception as exc:  # transient lookup problem — keep waiting
                logger.warning("Could not fetch %s: %s", message_id, exc)
                continue

            if message.status in TERMINAL_SUCCESS:
                return SendResult(ok=True, message_id=message_id)
            if message.status in TERMINAL_FAILURE:
                code = message.error_code
                return SendResult(
                    ok=False,
                    message_id=message_id,
                    error_code=code,
                    error_message=_describe(
                        code, getattr(message, "error_message", "") or f"Message {message.status}"
                    ),
                    unreachable_on_whatsapp=code in WHATSAPP_UNREACHABLE_CODES,
                )
        logger.info("Message %s still in flight after confirmation window", message_id)
        return None

    def send_sms(self, to: str, invite_url: str, guest_name: str) -> SendResult:
        sms_from = settings.TWILIO_SMS_FROM
        if not sms_from:
            return SendResult(
                ok=False,
                error_message="NEXAINVITE_TWILIO_SMS_FROM is not set, cannot fall back to SMS.",
            )
        return self._create(
            from_=sms_from, to=to, body=_plain_body(guest_name, invite_url)
        )


def _describe(code, message: str) -> str:
    """Append an actionable hint to Twilio's own error text where we have one."""
    hint = CONFIG_ERROR_HINTS.get(code)
    return f"{message} — {hint}" if hint else message


def _template_variables(guest_name: str, invite_url: str) -> str:
    import json

    return json.dumps({"1": guest_name, "2": invite_url})


def _plain_body(guest_name: str, invite_url: str) -> str:
    return f"Hi {guest_name}, you're invited! View your invitation here: {invite_url}"


def get_sender():
    backend = getattr(settings, "INVITE_SEND_BACKEND", "console")
    if backend == "twilio":
        return TwilioSender()
    return ConsoleSender()
