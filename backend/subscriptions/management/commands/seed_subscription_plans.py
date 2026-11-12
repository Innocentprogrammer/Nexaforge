from django.core.management.base import BaseCommand

from subscriptions.models import PlanCode, SubscriptionPlan


class Command(BaseCommand):
    help = "Create or update NexaInvite's default Normal, Gold and Diamond plans."

    def handle(self, *args, **options):
        # Prices are initial configurable launch values, not hard-coded in checkout.
        plans = [
            {
                "code": PlanCode.NORMAL,
                "name": "Normal",
                "description": "Start creating and sharing basic invitations.",
                "amount": 0,
                "duration_days": 3650,
                "display_order": 1,
                "features": ["Basic templates", "Invitation editor", "Guest list", "RSVP tracking"],
            },
            {
                "code": PlanCode.GOLD,
                "name": "Gold",
                "description": "For larger events that need premium invitation tools.",
                "amount": 29900,
                "duration_days": 30,
                "display_order": 2,
                "features": ["Everything in Normal", "Premium templates", "CSV guest import", "Personalized guest links", "PDF export"],
            },
            {
                "code": PlanCode.DIAMOND,
                "name": "Diamond",
                "description": "For high-touch event communication and delivery.",
                "amount": 79900,
                "duration_days": 30,
                "display_order": 3,
                "features": ["Everything in Gold", "WhatsApp invitation delivery", "SMS fallback", "Priority support"],
            },
        ]
        for data in plans:
            code = data.pop("code")
            plan, created = SubscriptionPlan.objects.get_or_create(code=code, defaults=data)
            action = "Created" if created else "Kept existing"
            self.stdout.write(self.style.SUCCESS(f"{action} {plan.name}: {plan.amount} paise / {plan.duration_days} days"))
