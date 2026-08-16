from django.contrib import admin

from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ["email", "full_name", "company", "source", "created_at"]
    list_filter = ["source"]
    search_fields = ["email", "full_name", "company"]
