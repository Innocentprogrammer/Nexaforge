from rest_framework import serializers

from accounts.models import User
from guests.models import Guest
from invitations.models import Invitation
from leads.models import Lead
from notifications.models import Notification
from products.models import Product
from subscriptions.models import Payment, Subscription
from templates_app.models import InvitationTemplate


class AdminUserSerializer(serializers.ModelSerializer):
    invitation_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "full_name", "phone", "role", "subscription_tier",
            "is_active", "is_staff", "is_superuser", "is_verified", "date_joined",
            "created_at", "invitation_count",
        )
        read_only_fields = ("id", "email", "subscription_tier", "is_superuser", "date_joined", "created_at", "invitation_count")


class AdminInvitationSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="user.email", read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)
    guest_count = serializers.IntegerField(read_only=True)
    rsvp_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Invitation
        fields = ("id", "title", "slug", "owner_email", "template", "template_name", "event_type", "event_date", "venue", "status", "guest_count", "rsvp_count", "created_at", "updated_at", "deleted_at")
        read_only_fields = fields


class AdminTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvitationTemplate
        fields = "__all__"
        read_only_fields = ("id", "created_at")


class AdminProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ("id", "created_at", "legacy_tagline", "legacy_description")


class AdminPaymentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)

    class Meta:
        model = Payment
        fields = ("id", "user_email", "plan_name", "amount", "currency", "status", "gateway_order_id", "gateway_payment_id", "failure_reason", "created_at", "updated_at")
        read_only_fields = fields


class AdminSubscriptionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)

    class Meta:
        model = Subscription
        fields = ("id", "user_email", "plan_name", "status", "starts_at", "ends_at", "created_at", "updated_at")
        read_only_fields = fields


class AdminLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = "__all__"
        read_only_fields = fields


class AdminNotificationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Notification
        fields = ("id", "user_email", "category", "title", "is_read", "email_status", "email_error", "created_at", "email_sent_at")
        read_only_fields = fields


class AdminGuestSerializer(serializers.ModelSerializer):
    invitation_title = serializers.CharField(source="invitation.title", read_only=True)

    class Meta:
        model = Guest
        fields = ("id", "full_name", "email", "phone_number", "invitation_title", "invitation_sent", "created_at")
        read_only_fields = fields
