from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ["email", "full_name", "role", "is_verified", "is_staff"]
    fieldsets = UserAdmin.fieldsets + (
        ("NexaInvite profile", {"fields": ("full_name", "phone", "role", "is_verified", "profile_image")}),
    )
