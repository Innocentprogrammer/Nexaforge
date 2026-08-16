from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "status", "order", "active"]
    list_filter = ["status", "active"]
    prepopulated_fields = {"slug": ("name",)}
