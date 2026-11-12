import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("category", models.CharField(choices=[("ACCOUNT", "Account"), ("INVITATION", "Invitation"), ("RSVP", "RSVP"), ("BILLING", "Billing"), ("SYSTEM", "System")], default="SYSTEM", max_length=12)),
                ("title", models.CharField(max_length=180)),
                ("message", models.TextField()),
                ("action_url", models.CharField(blank=True, max_length=500)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("is_read", models.BooleanField(default=False)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("email_status", models.CharField(choices=[("NOT_REQUESTED", "Not requested"), ("PENDING", "Pending"), ("SENT", "Sent"), ("FAILED", "Failed"), ("SKIPPED", "Skipped")], default="NOT_REQUESTED", max_length=16)),
                ("email_error", models.TextField(blank=True)),
                ("email_sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notifications", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="NotificationPreference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email_enabled", models.BooleanField(default=True)),
                ("email_account", models.BooleanField(default=True)),
                ("email_invitations", models.BooleanField(default=True)),
                ("email_rsvp", models.BooleanField(default=True)),
                ("email_billing", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="notification_preference", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["user", "is_read", "created_at"], name="notif_user_read_created_idx"),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["user", "category", "created_at"], name="notif_user_category_idx"),
        ),
    ]
