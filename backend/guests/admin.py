from django.contrib import admin

from .models import Guest


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ["full_name", "invitation", "email", "phone", "group_name"]
    list_filter = ["group_name"]
    search_fields = ["full_name", "email", "phone"]
