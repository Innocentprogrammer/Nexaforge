import uuid

from django.db import models


class InvitationTemplate(models.Model):
    class Category(models.TextChoices):
        WEDDING = "WEDDING", "Wedding"
        BIRTHDAY = "BIRTHDAY", "Birthday"
        ANNIVERSARY = "ANNIVERSARY", "Anniversary"
        CORPORATE = "CORPORATE", "Corporate"
        RELIGIOUS = "RELIGIOUS", "Religious"
        BABY_SHOWER = "BABY_SHOWER", "Baby Shower"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=Category.choices)
    thumbnail = models.URLField(blank=True)
    preview_image = models.URLField(blank=True)
    template_json = models.JSONField(default=dict, blank=True)
    premium = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["category"]), models.Index(fields=["premium"])]
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
