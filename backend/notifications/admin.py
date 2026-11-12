from django.contrib import admin

from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "category", "is_read", "email_status", "created_at"]
    list_filter = ["category", "is_read", "email_status", "created_at"]
    search_fields = ["title", "message", "user__email"]
    readonly_fields = ["created_at", "read_at", "email_sent_at"]


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ["user", "email_enabled", "email_account", "email_invitations", "email_rsvp", "email_billing"]
    search_fields = ["user__email"]
