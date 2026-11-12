"""Diagnose the diamond-invite send path without going through the UI.

    python manage.py check_twilio
    python manage.py check_twilio --to +919876543210

Reports which settings are missing, whether Twilio accepts the credentials, and
— with --to — performs one real send and prints the exact provider error code.
Credential values are never printed, only whether they are set.
"""

from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.models import SubscriptionTier
from guests.models import Guest
from guests.senders import WHATSAPP_UNREACHABLE_CODES, get_sender

REQUIRED = [
    ("TWILIO_ACCOUNT_SID", "NEXAINVITE_TWILIO_ACCOUNT_SID", True),
    ("TWILIO_AUTH_TOKEN", "NEXAINVITE_TWILIO_AUTH_TOKEN", True),
    # At least one sender is required, but either one will do — WhatsApp-only,
    # SMS-only and both are all valid configurations.
    ("TWILIO_WHATSAPP_FROM", "NEXAINVITE_TWILIO_WHATSAPP_FROM", False),
    ("TWILIO_SMS_FROM", "NEXAINVITE_TWILIO_SMS_FROM", False),
    ("TWILIO_TEMPLATE_SID", "NEXAINVITE_TWILIO_TEMPLATE_SID", False),
]


class Command(BaseCommand):
    help = "Check the Twilio configuration used by send_diamond_invites."

    def add_arguments(self, parser):
        parser.add_argument(
            "--to",
            help="E.164 number to send one real test message to (costs money).",
        )
        parser.add_argument(
            "--channel",
            choices=["whatsapp", "sms"],
            help="Channel for --to. Defaults to whatsapp when a WhatsApp sender "
            "is configured, otherwise sms.",
        )

    def handle(self, *args, **options):
        ok = self.style.SUCCESS
        bad = self.style.ERROR
        warn = self.style.WARNING

        backend = getattr(settings, "INVITE_SEND_BACKEND", "console")
        self.stdout.write(f"INVITE_SEND_BACKEND = {backend}")
        if backend != "twilio":
            self.stdout.write(
                warn(
                    "  -> Simulated backend. Rows will be marked SENT and nothing is\n"
                    "     actually delivered. Set INVITE_SEND_BACKEND=twilio in backend/.env."
                )
            )

        self.stdout.write("\nSettings (values not shown):")
        missing_required = []
        for name, env_name, required in REQUIRED:
            value = getattr(settings, name, "")
            if value:
                self.stdout.write(ok(f"  {env_name:34} set ({len(value)} chars)"))
            elif required:
                missing_required.append(env_name)
                self.stdout.write(bad(f"  {env_name:34} EMPTY  <-- required"))
            else:
                self.stdout.write(warn(f"  {env_name:34} empty  (optional)"))

        wa = getattr(settings, "TWILIO_WHATSAPP_FROM", "")
        sms = getattr(settings, "TWILIO_SMS_FROM", "")
        if not wa and not sms:
            missing_required.append("NEXAINVITE_TWILIO_WHATSAPP_FROM or ..._SMS_FROM")
        elif not wa:
            self.stdout.write(
                warn("\n  No WhatsApp sender -> sends go straight to SMS (WhatsApp skipped).")
            )
        elif not sms:
            self.stdout.write(
                warn("\n  No SMS sender -> nothing to fall back to if WhatsApp is unreachable.")
            )

        if missing_required:
            self.stdout.write(
                bad(
                    "\nCannot send: fill "
                    + ", ".join(missing_required)
                    + " in backend/.env, then RESTART the Django server "
                    "(settings are read once at import)."
                )
            )
            return

        self.stdout.write("\nGuests:")
        # Tier is the host's plan now, not a per-guest column: sendable guests are
        # every guest belonging to a DIAMOND account.
        diamond = Guest.objects.filter(
            invitation__user__subscription_tier=SubscriptionTier.DIAMOND
        )
        self.stdout.write(f"  guests on diamond accounts: {diamond.count()}")
        no_phone = diamond.filter(phone_number="").count()
        if no_phone:
            self.stdout.write(warn(f"  {no_phone} of them have no phone number and will fail"))
        if not diamond.exists():
            self.stdout.write(
                warn(
                    "  Nothing to send to — put the host account on the Diamond plan "
                    "first (manage.py set_subscription_tier <email> DIAMOND)."
                )
            )

        self.stdout.write("\nCredentials:")
        try:
            sender = get_sender()
        except Exception as exc:  # configuration problem
            self.stdout.write(bad(f"  could not build sender: {exc}"))
            return

        try:
            account = sender.client.api.accounts(settings.TWILIO_ACCOUNT_SID).fetch()
            self.stdout.write(ok(f"  authenticated — account status: {account.status}"))
            if account.type and account.type.lower() == "trial":
                self.stdout.write(
                    warn(
                        "  TRIAL account: you can only message numbers you have verified in\n"
                        "  the Twilio console, and WhatsApp requires the recipient to join the\n"
                        "  sandbox first by texting 'join <your-code>' to the sandbox number."
                    )
                )
        except Exception as exc:
            self.stdout.write(bad(f"  authentication failed: {exc}"))
            return

        to = options.get("to")
        if not to:
            self.stdout.write(
                "\nConfig looks usable. Re-run with --to +91XXXXXXXXXX to try a real send."
            )
            return

        channel = options.get("channel") or ("whatsapp" if wa else "sms")
        send = sender.send_whatsapp if channel == "whatsapp" else sender.send_sms
        self.stdout.write(f"\nSending a real {channel.upper()} message to {to} ...")
        result = send(to, f"{settings.FRONTEND_URL}/invite/test-token", "Test")
        if result.ok:
            self.stdout.write(ok(f"  accepted by Twilio, sid={result.message_id}"))
            self.stdout.write(
                "  If it never arrives, check the message's delivery status in the Twilio\n"
                "  console — acceptance is not delivery."
            )
            return

        self.stdout.write(bad(f"  failed: [{result.error_code}] {result.error_message}"))
        if result.error_code in WHATSAPP_UNREACHABLE_CODES:
            self.stdout.write(
                "  That code means the number isn't reachable on WhatsApp, so the real task\n"
                "  would now fall back to SMS."
            )
            if not settings.TWILIO_SMS_FROM:
                self.stdout.write(
                    bad("  ...but NEXAINVITE_TWILIO_SMS_FROM is empty, so the fallback can't run.")
                )
