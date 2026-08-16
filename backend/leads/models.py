import uuid

from django.db import models


class Lead(models.Model):
    """Captures Contact page submissions and footer newsletter sign-ups — the corporate
    site's lead-generation surface (Website Blueprint.MD: 'Every CTA should map to a
    CRM workflow'). No CRM exists yet, so this table is that workflow's landing spot."""

    class Source(models.TextChoices):
        CONTACT_PAGE = "CONTACT_PAGE", "Contact Page"
        NEWSLETTER = "NEWSLETTER", "Newsletter Signup"
        CONSULTATION = "CONSULTATION", "Book a Consultation"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField()
    company = models.CharField(max_length=150, blank=True)
    message = models.TextField(blank=True)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.CONTACT_PAGE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.email} ({self.get_source_display()})"
