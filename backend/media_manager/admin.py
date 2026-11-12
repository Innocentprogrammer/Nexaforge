from django.contrib import admin

from .models import MediaAsset


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "mime_type", "file_size", "created_at"]
    search_fields = ["title", "user__email"]
    readonly_fields = ["mime_type", "file_size", "width", "height", "created_at"]
