import uuid

from django.db import models


class Product(models.Model):
    """A member of the NexaForge product suite, shown on the corporate /products page
    and its mega-menu. NexaInvite is the only OPERATIONAL product today — everything
    else is a placeholder so the Products page/nav never needs a redesign to add one."""

    class Status(models.TextChoices):
        OPERATIONAL = "OPERATIONAL", "Operational"
        BETA = "BETA", "Beta"
        COMING_SOON = "COMING_SOON", "Coming Soon"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    tagline = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMING_SOON)
    icon_key = models.CharField(
        max_length=40,
        default="box",
        help_text="Maps to an icon in the frontend icon set (e.g. 'invite', 'crm', 'erp').",
    )
    href = models.CharField(
        max_length=200,
        blank=True,
        help_text="Internal route to the product's landing page, e.g. /products/nexainvite. "
        "Left blank for Coming Soon products with no page yet.",
    )
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "name"]
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return self.name
