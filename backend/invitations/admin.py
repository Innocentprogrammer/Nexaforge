from django.contrib import admin

from .models import Invitation


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "status", "event_date", "created_at"]
    list_filter = ["status", "event_type"]
    search_fields = ["title", "slug"]
