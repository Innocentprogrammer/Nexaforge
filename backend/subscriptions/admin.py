from django.contrib import admin

from .models import Payment, Subscription, SubscriptionPlan, WebhookEvent


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "amount", "currency", "duration_days", "is_active")
    list_filter = ("is_active", "currency")
    search_fields = ("code", "name")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "plan", "status", "starts_at", "ends_at", "created_at")
    list_filter = ("status", "plan")
    search_fields = ("user__email",)
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("user", "plan", "amount", "currency", "status", "gateway_order_id", "created_at")
    list_filter = ("status", "plan", "currency")
    search_fields = ("user__email", "gateway_order_id", "gateway_payment_id")
    readonly_fields = ("id", "created_at", "updated_at", "gateway_payload")


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ("event_id", "event_type", "processed", "received_at", "processed_at")
    list_filter = ("event_type", "processed")
    readonly_fields = ("event_id", "event_type", "payload", "received_at", "processed_at")
