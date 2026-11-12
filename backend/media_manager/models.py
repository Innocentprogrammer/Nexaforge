import uuid
from pathlib import Path

from django.conf import settings
from django.db import models


def user_media_path(instance, filename):
    suffix = Path(filename).suffix.lower() or ".jpg"
    return f"user-media/{instance.user_id}/{uuid.uuid4().hex}{suffix}"


class MediaAsset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="media_assets",
    )
    title = models.CharField(max_length=160, blank=True)
    file = models.ImageField(upload_to=user_media_path)
    mime_type = models.CharField(max_length=80, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"])]

    def __str__(self):
        return self.title or self.file.name
