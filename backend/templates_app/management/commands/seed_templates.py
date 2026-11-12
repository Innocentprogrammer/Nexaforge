from django.core.management.base import BaseCommand

from templates_app.models import InvitationTemplate

TEMPLATES = [
    {
        "name": "Royal Gold Wedding",
        "category": InvitationTemplate.Category.WEDDING,
        "premium": True,
        "price": 4.99,
        "template_json": {
            "background_color": "#0B1F3A",
            "background_color_2": "#1A3A5C",
            "font_color": "#F4D793",
            "accent_color": "#D4AF37",
            "heading_font": "playfair",
            "pattern": "frame",
            "heading": "Together With Their Families",
            "subheading": "Bride & Groom",
        },
    },
    {
        "name": "Minimal Ivory Wedding",
        "category": InvitationTemplate.Category.WEDDING,
        "premium": False,
        "price": 0,
        "template_json": {
            "background_color": "#FFFFFF",
            "background_color_2": "#F3E9DC",
            "font_color": "#22303F",
            "accent_color": "#2563EB",
            "heading_font": "playfair",
            "pattern": "none",
            "heading": "We're Getting Married",
            "subheading": "Bride & Groom",
        },
    },
    {
        "name": "Floral Garden Wedding",
        "category": InvitationTemplate.Category.WEDDING,
        "premium": True,
        "price": 3.99,
        "template_json": {
            "background_color": "#FDF6F0",
            "background_color_2": "#F3E7DA",
            "font_color": "#3F6B4A",
            "accent_color": "#10B981",
            "heading_font": "dancing",
            "pattern": "florals",
            "heading": "A Garden Celebration",
            "subheading": "Bride & Groom",
        },
    },
    {
        "name": "Confetti Birthday",
        "category": InvitationTemplate.Category.BIRTHDAY,
        "premium": False,
        "price": 0,
        "template_json": {
            "background_color": "#FFF7E6",
            "background_color_2": "#FFE8CC",
            "font_color": "#92400E",
            "accent_color": "#F59E0B",
            "heading_font": "poppins",
            "pattern": "confetti",
            "heading": "Let's Celebrate!",
            "subheading": "Birthday Party",
        },
    },
    {
        "name": "Golden Anniversary",
        "category": InvitationTemplate.Category.ANNIVERSARY,
        "premium": True,
        "price": 2.99,
        "template_json": {
            "background_color": "#0B1F3A",
            "background_color_2": "#24406B",
            "font_color": "#E8C874",
            "accent_color": "#D4AF37",
            "heading_font": "playfair",
            "pattern": "sparkle",
            "heading": "Celebrating Our Anniversary",
            "subheading": "Years Together",
        },
    },
    {
        "name": "Modern Corporate Event",
        "category": InvitationTemplate.Category.CORPORATE,
        "premium": False,
        "price": 0,
        "template_json": {
            "background_color": "#111827",
            "background_color_2": "#1F2937",
            "font_color": "#E5E7EB",
            "accent_color": "#2563EB",
            "heading_font": "inter",
            "pattern": "dots",
            "heading": "You're Invited",
            "subheading": "Corporate Event",
        },
    },
    {
        "name": "Sacred Ceremony",
        "category": InvitationTemplate.Category.RELIGIOUS,
        "premium": False,
        "price": 0,
        "template_json": {
            "background_color": "#F8FAFC",
            "background_color_2": "#EFF6EF",
            "font_color": "#166534",
            "accent_color": "#16A34A",
            "heading_font": "playfair",
            "pattern": "frame",
            "heading": "Join Us in Celebration",
            "subheading": "Religious Ceremony",
        },
    },
    {
        "name": "Little Star Baby Shower",
        "category": InvitationTemplate.Category.BABY_SHOWER,
        "premium": False,
        "price": 0,
        "template_json": {
            "background_color": "#EFF6FF",
            "background_color_2": "#FDE8F0",
            "font_color": "#3B5BA5",
            "accent_color": "#2563EB",
            "heading_font": "dancing",
            "pattern": "sparkle",
            "heading": "A Little Star Is Coming",
            "subheading": "Baby Shower",
        },
    },
]


class Command(BaseCommand):
    help = "Add the original invitation templates without overwriting existing card details."

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for data in TEMPLATES:
            _, was_created = InvitationTemplate.objects.get_or_create(
                name=data["name"], defaults=data
            )
            if was_created:
                created += 1
            else:
                updated += 1
        self.stdout.write(
            self.style.SUCCESS(f"Seeded templates: {created} created, {updated} updated.")
        )
