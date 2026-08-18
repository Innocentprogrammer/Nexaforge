from django.contrib import admin

from .models import Guest, InviteSendLog


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ["full_name", "invitation", "email", "phone_number", "group_name"]
    list_filter = ["group_name"]
    search_fields = ["full_name", "email", "phone_number", "unique_token"]
    readonly_fields = ["unique_token", "invite_opened_at"]


@admin.register(InviteSendLog)
class InviteSendLogAdmin(admin.ModelAdmin):
    list_display = ["guest", "channel", "status", "created_at"]
    list_filter = ["channel", "status"]
    search_fields = ["guest__full_name", "provider_message_id"]
    readonly_fields = ["created_at", "updated_at"]
