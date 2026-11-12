from django.contrib import admin

from .models import RSVP


@admin.register(RSVP)
class RSVPAdmin(admin.ModelAdmin):
    list_display = ["guest", "invitation", "response", "guest_count", "responded_at"]
    list_filter = ["response"]
