from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Load original invitation cards, the extended card catalogue, and NexaForge product details without removing existing records."

    def handle(self, *args, **options):
        call_command("seed_templates")
        call_command("seed_invitation_catalog")
        call_command("seed_product_catalog")
        self.stdout.write(self.style.SUCCESS("Original and extended NexaInvite catalogues are ready."))
