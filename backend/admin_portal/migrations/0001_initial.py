import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="AdminActivityLog",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("action", models.CharField(max_length=80)),
                ("target_type", models.CharField(max_length=80)),
                ("target_id", models.CharField(max_length=80, blank=True)),
                ("summary", models.CharField(max_length=255)),
                ("metadata", models.JSONField(default=dict, blank=True)),
                ("ip_address", models.GenericIPAddressField(null=True, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.SET_NULL, null=True, blank=True, related_name="admin_activity_logs")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="adminactivitylog",
            index=models.Index(fields=["created_at"], name="adminlog_created_idx"),
        ),
        migrations.AddIndex(
            model_name="adminactivitylog",
            index=models.Index(fields=["target_type", "action"], name="adminlog_target_action_idx"),
        ),
    ]
