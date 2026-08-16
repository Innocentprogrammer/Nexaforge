from django.core.management.base import BaseCommand

from products.models import Product

PRODUCTS = [
    {
        "slug": "nexainvite",
        "name": "NexaInvite",
        "tagline": "Digital invitations & event management",
        "description": (
            "Design beautiful digital invitations, track RSVPs in real time, and manage your "
            "guest list — for weddings, birthdays, and corporate events."
        ),
        "status": Product.Status.OPERATIONAL,
        "icon_key": "invite",
        "href": "/products/nexainvite",
        "order": 1,
    },
    {
        "slug": "nexacrm",
        "name": "NexaCRM",
        "tagline": "Customer relationship management",
        "description": "Unified client intelligence with automated relationship mapping and retention tracking.",
        "status": Product.Status.COMING_SOON,
        "icon_key": "crm",
        "href": "",
        "order": 2,
    },
    {
        "slug": "nexaerp",
        "name": "NexaERP",
        "tagline": "Enterprise resource planning",
        "description": "Institutional resource planning covering finance, HR, and supply chain in one system.",
        "status": Product.Status.COMING_SOON,
        "icon_key": "erp",
        "href": "",
        "order": 3,
    },
    {
        "slug": "nexaflow",
        "name": "NexaFlow",
        "tagline": "Workflow automation",
        "description": "No-code automation that connects your tools and eliminates repetitive manual work.",
        "status": Product.Status.COMING_SOON,
        "icon_key": "flow",
        "href": "",
        "order": 4,
    },
    {
        "slug": "nexaai",
        "name": "NexaAI",
        "tagline": "AI decision engine",
        "description": "Predictive modeling and AI-assisted decision support for enterprise risk and planning.",
        "status": Product.Status.COMING_SOON,
        "icon_key": "ai",
        "href": "",
        "order": 5,
    },
]


class Command(BaseCommand):
    help = "Seed the NexaForge product suite (shown on /products and the header mega-menu)."

    def handle(self, *args, **options):
        created = 0
        for data in PRODUCTS:
            _, was_created = Product.objects.update_or_create(
                slug=data["slug"], defaults=data
            )
            if was_created:
                created += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded products: {created} created, {len(PRODUCTS) - created} updated."
            )
        )
