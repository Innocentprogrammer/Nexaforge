"""Backfill per-guest invite tokens, then enforce uniqueness.

Split from 0002 on purpose: a callable default on a unique field is evaluated once
per migration, not once per row, so adding the column as unique in one step would
collide on any table that already has more than one guest.
"""

from django.db import migrations, models

import guests.models


def backfill_tokens(apps, schema_editor):
    Guest = apps.get_model("guests", "Guest")
    for guest in Guest.objects.filter(unique_token="").only("id"):
        Guest.objects.filter(pk=guest.pk).update(
            unique_token=guests.models.generate_invite_token()
        )


class Migration(migrations.Migration):

    dependencies = [
        ("guests", "0002_invitesendlog_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="guest",
            name="unique_token",
            field=models.CharField(
                default=guests.models.generate_invite_token,
                editable=False,
                max_length=32,
                unique=True,
            ),
        ),
    ]
