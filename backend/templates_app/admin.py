from django.contrib import admin

from .models import InvitationTemplate


@admin.register(InvitationTemplate)
class InvitationTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "premium", "price", "active"]
    list_filter = ["category", "premium", "active"]
