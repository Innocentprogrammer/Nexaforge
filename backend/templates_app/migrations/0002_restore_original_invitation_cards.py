import uuid
from decimal import Decimal

from django.db import migrations


LEGACY_TEMPLATES = [
    {
        "id": "3fa94277-fb2b-49ab-8937-8b8f7c93aa9c",
        "name": "Royal Gold Wedding",
        "category": "WEDDING",
        "thumbnail": "",
        "preview_image": "",
        "template_json": {"background_color": "#0B1F3A", "background_color_2": "#1A3A5C", "font_color": "#F4D793", "accent_color": "#D4AF37", "heading_font": "playfair", "pattern": "frame", "heading": "Together With Their Families", "subheading": "Bride & Groom"},
        "premium": True,
        "price": Decimal("4.99"),
        "active": True,
    },
    {
        "id": "16fc830d-ee7e-4ac4-b87b-ccf522eac63d",
        "name": "Minimal Ivory Wedding",
        "category": "WEDDING",
        "thumbnail": "",
        "preview_image": "",
        "template_json": {"background_color": "#FFFFFF", "background_color_2": "#F3E9DC", "font_color": "#22303F", "accent_color": "#2563EB", "heading_font": "playfair", "pattern": "none", "heading": "We're Getting Married", "subheading": "Bride & Groom"},
        "premium": False,
        "price": Decimal("0.00"),
        "active": True,
    },
    {
        "id": "4ba256d2-23d5-45fc-8aa0-dec311acb32c",
        "name": "Floral Garden Wedding",
        "category": "WEDDING",
        "thumbnail": "",
        "preview_image": "",
        "template_json": {"background_color": "#FDF6F0", "background_color_2": "#F3E7DA", "font_color": "#3F6B4A", "accent_color": "#10B981", "heading_font": "dancing", "pattern": "florals", "heading": "A Garden Celebration", "subheading": "Bride & Groom"},
        "premium": True,
        "price": Decimal("3.99"),
        "active": True,
    },
    {
        "id": "29b1fb35-eafd-49e2-b21c-09ca18217d9b",
        "name": "Confetti Birthday",
        "category": "BIRTHDAY",
        "thumbnail": "",
        "preview_image": "",
        "template_json": {"background_color": "#FFF7E6", "background_color_2": "#FFE8CC", "font_color": "#92400E", "accent_color": "#F59E0B", "heading_font": "poppins", "pattern": "confetti", "heading": "Let's Celebrate!", "subheading": "Birthday Party"},
        "premium": False,
        "price": Decimal("0.00"),
        "active": True,
    },
    {
        "id": "6b2de2a4-aef3-4a9e-b35a-603bec4f4f92",
        "name": "Golden Anniversary",
        "category": "ANNIVERSARY",
        "thumbnail": "",
        "preview_image": "",
        "template_json": {"background_color": "#0B1F3A", "background_color_2": "#24406B", "font_color": "#E8C874", "accent_color": "#D4AF37", "heading_font": "playfair", "pattern": "sparkle", "heading": "Celebrating Our Anniversary", "subheading": "Years Together"},
        "premium": True,
        "price": Decimal("2.99"),
        "active": True,
    },
    {
        "id": "79e56862-b5b1-45d3-ab77-c78d1141b8fd",
        "name": "Modern Corporate Event",
        "category": "CORPORATE",
        "thumbnail": "",
        "preview_image": "",
        "template_json": {"background_color": "#111827", "background_color_2": "#1F2937", "font_color": "#E5E7EB", "accent_color": "#2563EB", "heading_font": "inter", "pattern": "dots", "heading": "You're Invited", "subheading": "Corporate Event"},
        "premium": False,
        "price": Decimal("0.00"),
        "active": True,
    },
    {
        "id": "bce90a0d-a1fb-4b63-a91b-bbddf27629bf",
        "name": "Sacred Ceremony",
        "category": "RELIGIOUS",
        "thumbnail": "",
        "preview_image": "",
        "template_json": {"background_color": "#F8FAFC", "background_color_2": "#EFF6EF", "font_color": "#166534", "accent_color": "#16A34A", "heading_font": "playfair", "pattern": "frame", "heading": "Join Us in Celebration", "subheading": "Religious Ceremony"},
        "premium": False,
        "price": Decimal("0.00"),
        "active": True,
    },
    {
        "id": "b828d87b-e471-4c5b-9bb8-08b0ce8a192b",
        "name": "Little Star Baby Shower",
        "category": "BABY_SHOWER",
        "thumbnail": "",
        "preview_image": "",
        "template_json": {"background_color": "#EFF6FF", "background_color_2": "#FDE8F0", "font_color": "#3B5BA5", "accent_color": "#2563EB", "heading_font": "dancing", "pattern": "sparkle", "heading": "A Little Star Is Coming", "subheading": "Baby Shower"},
        "premium": False,
        "price": Decimal("0.00"),
        "active": True,
    },
]


def restore_original_cards(apps, schema_editor):
    Template = apps.get_model("templates_app", "InvitationTemplate")
    for raw in LEGACY_TEMPLATES:
        data = dict(raw)
        original_id = uuid.UUID(data.pop("id"))
        name = data["name"]

        # Phase 3 used the same display name for a different anniversary design.
        # Keep that card, but give it a distinct name before restoring the original.
        if name == "Golden Anniversary":
            phase3_card = Template.objects.filter(name=name).exclude(pk=original_id).first()
            # A different primary key does not necessarily mean a different
            # design: the legacy seed command may have created this exact card
            # before fixed IDs were introduced. Rename only if its design differs.
            if phase3_card and phase3_card.template_json != data["template_json"]:
                modern_name = "Golden Anniversary Modern"
                if Template.objects.filter(name=modern_name).exclude(pk=phase3_card.pk).exists():
                    modern_name = "Golden Anniversary Modern (Phase 3)"
                phase3_card.name = modern_name
                phase3_card.save(update_fields=["name"])

        card = Template.objects.filter(pk=original_id).first()
        if name == "Golden Anniversary" and card and card.template_json != data["template_json"]:
            modern_name = "Golden Anniversary Modern"
            if Template.objects.filter(name=modern_name).exists():
                modern_name = "Golden Anniversary Modern (Phase 3)"
            if not Template.objects.filter(name=modern_name).exists():
                modern_data = {
                    field: getattr(card, field)
                    for field in ("category", "thumbnail", "preview_image", "template_json", "premium", "price", "active")
                }
                Template.objects.create(id=uuid.uuid4(), name=modern_name, **modern_data)
        if card is None:
            # If an earlier seed created the original card under a generated ID,
            # update that row rather than create a duplicate or break references.
            card = Template.objects.filter(name=name).first()
        if card is None:
            Template.objects.create(id=original_id, **data)
        else:
            for field, value in data.items():
                setattr(card, field, value)
            card.save(update_fields=list(data.keys()))


def noop_reverse(apps, schema_editor):
    # Original catalogue content is retained if this migration is reversed.
    pass


class Migration(migrations.Migration):
    dependencies = [("templates_app", "0001_initial")]

    operations = [migrations.RunPython(restore_original_cards, noop_reverse)]
