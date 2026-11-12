"""Normalise phone numbers that predate the E.164 field.

Rows created before the phone -> phone_number rename hold bare national numbers
(e.g. "8445518517"). They are readable in the UI but Twilio cannot send to them,
and the API now refuses to re-save them unedited. Normalise the ones that map
unambiguously and leave anything else untouched for a human to look at.
"""

from django.db import migrations

from guests.phone import normalize_phone_number
from guests.models import E164_RE


def normalize(apps, schema_editor):
    Guest = apps.get_model("guests", "Guest")
    for pk, raw in Guest.objects.exclude(phone_number="").values_list("pk", "phone_number"):
        if E164_RE.match(raw):
            continue
        candidate = normalize_phone_number(raw)
        if candidate != raw and E164_RE.match(candidate):
            Guest.objects.filter(pk=pk).update(phone_number=candidate)


class Migration(migrations.Migration):

    dependencies = [
        ("guests", "0003_guest_unique_token_unique"),
    ]

    # Not reversible: the original spelling isn't recoverable from the result.
    operations = [migrations.RunPython(normalize, migrations.RunPython.noop)]
