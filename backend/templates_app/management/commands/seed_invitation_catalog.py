from django.core.management.base import BaseCommand
from templates_app.models import InvitationTemplate


TEMPLATES = [
    ("Royal Maroon Wedding", "WEDDING", False, "0.00", {"heading": "Aarav & Meera", "subheading": "Together with our families", "message": "Request the pleasure of your company", "background_color": "#fff7ed", "background_color_2": "#f5d0a9", "font_color": "#641e16", "accent_color": "#9f1239", "heading_font": "playfair", "pattern": "frame"}),
    ("Ivory Floral Wedding", "WEDDING", True, "199.00", {"heading": "The Wedding of", "subheading": "Ishita & Rohan", "message": "A day of love, laughter and forever", "background_color": "#fffdf5", "background_color_2": "#fce7e7", "font_color": "#5b4636", "accent_color": "#b76e79", "heading_font": "dancing", "pattern": "florals"}),
    ("Sage Garden Wedding", "WEDDING", True, "249.00", {"heading": "Save the Date", "subheading": "Kavya & Arjun", "message": "Join us as we begin our forever", "background_color": "#f0fdf4", "background_color_2": "#dcfce7", "font_color": "#14532d", "accent_color": "#4d7c0f", "heading_font": "playfair", "pattern": "florals"}),
    ("Midnight Gold Wedding", "WEDDING", True, "299.00", {"heading": "An Evening of Elegance", "subheading": "Naina & Vivaan", "message": "Celebrate our new beginning", "background_color": "#18181b", "background_color_2": "#3f3f46", "font_color": "#fef3c7", "accent_color": "#d4af37", "heading_font": "playfair", "pattern": "sparkle"}),
    ("Pastel Birthday Bash", "BIRTHDAY", False, "0.00", {"heading": "Let's Celebrate!", "subheading": "It's my birthday", "message": "Cake, music and memories await", "background_color": "#fdf2f8", "background_color_2": "#fce7f3", "font_color": "#831843", "accent_color": "#db2777", "heading_font": "dancing", "pattern": "confetti"}),
    ("Bold Birthday Party", "BIRTHDAY", True, "99.00", {"heading": "Party Time", "subheading": "You're invited to the celebration", "message": "Come ready for fun!", "background_color": "#eff6ff", "background_color_2": "#dbeafe", "font_color": "#1e3a8a", "accent_color": "#2563eb", "heading_font": "poppins", "pattern": "confetti"}),
    ("Golden Anniversary Modern", "ANNIVERSARY", False, "0.00", {"heading": "Still Falling for You", "subheading": "Celebrating 25 beautiful years", "message": "Join us for an evening of memories", "background_color": "#fffbeb", "background_color_2": "#fef3c7", "font_color": "#78350f", "accent_color": "#b45309", "heading_font": "playfair", "pattern": "frame"}),
    ("Minimal Anniversary", "ANNIVERSARY", True, "149.00", {"heading": "A Lifetime Together", "subheading": "Anniversary Celebration", "message": "Your presence will make it special", "background_color": "#fafafa", "background_color_2": "#e5e7eb", "font_color": "#27272a", "accent_color": "#71717a", "heading_font": "inter", "pattern": "dots"}),
    ("Modern Business Launch", "CORPORATE", False, "0.00", {"heading": "You're Invited", "subheading": "Product Launch 2026", "message": "Ideas. Innovation. What's next.", "background_color": "#eff6ff", "background_color_2": "#dbeafe", "font_color": "#1e3a8a", "accent_color": "#2563eb", "heading_font": "poppins", "pattern": "dots"}),
    ("Executive Summit", "CORPORATE", True, "199.00", {"heading": "Leadership Summit", "subheading": "NexaForge Technologies", "message": "An afternoon of insight and collaboration", "background_color": "#111827", "background_color_2": "#374151", "font_color": "#f9fafb", "accent_color": "#60a5fa", "heading_font": "inter", "pattern": "frame"}),
    ("Traditional Ceremony", "RELIGIOUS", False, "0.00", {"heading": "With Divine Blessings", "subheading": "You are invited to the ceremony", "message": "Join our family for this auspicious occasion", "background_color": "#fff7ed", "background_color_2": "#fed7aa", "font_color": "#7c2d12", "accent_color": "#c2410c", "heading_font": "playfair", "pattern": "florals"}),
    ("Little One Baby Shower", "BABY_SHOWER", False, "0.00", {"heading": "A Little One is on the Way", "subheading": "Baby Shower", "message": "Join us for a sweet celebration", "background_color": "#f0f9ff", "background_color_2": "#e0f2fe", "font_color": "#075985", "accent_color": "#38bdf8", "heading_font": "dancing", "pattern": "confetti"}),
]


class Command(BaseCommand):
    help = "Add the extended NexaInvite invitation card catalogue without overwriting existing card details."

    def handle(self, *args, **options):
        created = updated = 0
        for name, category, premium, price, design in TEMPLATES:
            _, was_created = InvitationTemplate.objects.get_or_create(
                name=name,
                defaults={
                    "category": category,
                    "premium": premium,
                    "price": price,
                    "template_json": design,
                    "thumbnail": "",
                    "preview_image": "",
                    "active": True,
                },
            )
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(self.style.SUCCESS(
            f"Invitation catalogue ready: {created} created, {updated} updated, {len(TEMPLATES)} total."
        ))
