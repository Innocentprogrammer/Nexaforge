from rest_framework import serializers

from .models import Payment, Subscription, SubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    amount_rupees = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = ["id", "code", "name", "description", "amount", "amount_rupees", "currency", "duration_days", "features"]

    def get_amount_rupees(self, obj):
        return obj.amount / 100


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = ["id", "plan", "status", "duration_days", "starts_at", "ends_at", "created_at"]


class PaymentSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    amount_rupees = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ["id", "plan_name", "amount", "amount_rupees", "currency", "status", "gateway_order_id", "gateway_payment_id", "failure_reason", "created_at"]

    def get_amount_rupees(self, obj):
        return obj.amount / 100
