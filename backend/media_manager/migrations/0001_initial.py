import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import media_manager.models


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name="MediaAsset",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(blank=True, max_length=160)),
                ("file", models.ImageField(upload_to=media_manager.models.user_media_path)),
                ("mime_type", models.CharField(blank=True, max_length=80)),
                ("file_size", models.PositiveBigIntegerField(default=0)),
                ("width", models.PositiveIntegerField(default=0)),
                ("height", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="media_assets", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="mediaasset",
            index=models.Index(fields=["user", "created_at"], name="media_user_created_idx"),
        ),
    ]
