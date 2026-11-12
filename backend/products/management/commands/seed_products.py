from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Compatibility alias for the current NexaForge product catalogue seed."

    def handle(self, *args, **options):
        call_command("seed_product_catalog")
