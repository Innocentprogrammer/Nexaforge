"""Put a host account on a subscription tier.

    python manage.py set_subscription_tier host@example.com GOLD
    python manage.py set_subscription_tier --list

There is no billing in this build, so tier is **not** self-service: the API
exposes ``subscription_tier`` read-only (a PATCH to /users/me/ cannot change it)
precisely so an account can't upgrade itself past a paywall that doesn't exist
yet. This command and the Django admin are the two ways to move an account, and
this is what the end-to-end tests use to set up Normal/Gold/Diamond hosts.
"""

from django.core.management.base import BaseCommand, CommandError

from accounts.models import SubscriptionTier, User

CHOICES = [tier.value for tier in SubscriptionTier]


class Command(BaseCommand):
    help = "Set a user's subscription_tier (NORMAL / GOLD / DIAMOND)."

    def add_arguments(self, parser):
        parser.add_argument("email", nargs="?", help="Email of the account to change.")
        parser.add_argument("tier", nargs="?", help=f"One of {', '.join(CHOICES)}.")
        parser.add_argument(
            "--list",
            action="store_true",
            help="List every account's current tier and exit.",
        )

    def handle(self, *args, **options):
        if options["list"]:
            for user in User.objects.order_by("email"):
                self.stdout.write(f"{user.subscription_tier:8} {user.email}")
            return

        email, tier = options["email"], options["tier"]
        if not email or not tier:
            raise CommandError("Give an email and a tier, or use --list.")

        tier = tier.strip().upper()
        if tier not in CHOICES:
            raise CommandError(f"Unknown tier {tier!r}. Choose one of {', '.join(CHOICES)}.")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f"No account with email {email!r}.")

        previous = user.subscription_tier
        user.subscription_tier = tier
        user.save(update_fields=["subscription_tier", "updated_at"])
        self.stdout.write(self.style.SUCCESS(f"{email}: {previous} -> {tier}"))
