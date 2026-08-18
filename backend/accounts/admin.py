from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ["email", "full_name", "role", "subscription_tier", "is_verified", "is_staff"]
    list_filter = UserAdmin.list_filter + ("subscription_tier",)
    fieldsets = UserAdmin.fieldsets + (
        (
            "NexaInvite profile",
            {
                "fields": (
                    "full_name",
                    "phone",
                    "role",
                    "subscription_tier",
                    "is_verified",
                    "profile_image",
                )
            },
        ),
    )
