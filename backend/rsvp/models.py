import uuid

from django.db import models

from guests.models import Guest
from invitations.models import Invitation


class RSVP(models.Model):
    class Response(models.TextChoices):
        ACCEPTED = "ACCEPTED", "Accepted"
        DECLINED = "DECLINED", "Declined"
        MAYBE = "MAYBE", "Maybe"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest = models.OneToOneField(Guest, on_delete=models.CASCADE, related_name="rsvp")
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name="rsvps")
    response = models.CharField(max_length=20, choices=Response.choices)
    guest_count = models.PositiveSmallIntegerField(default=1)
    message = models.TextField(blank=True)
    responded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["guest"]), models.Index(fields=["invitation"])]
        ordering = ["-responded_at"]

    def __str__(self):
        return f"{self.guest.full_name} - {self.response}"
