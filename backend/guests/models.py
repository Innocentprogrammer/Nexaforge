import uuid

from django.db import models

from invitations.models import Invitation


class Guest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name="guests")
    full_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    group_name = models.CharField(max_length=100, blank=True)
    invitation_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["invitation"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["email"]),
        ]
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name
