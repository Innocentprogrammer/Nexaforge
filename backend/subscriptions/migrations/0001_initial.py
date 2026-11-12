# Generated for NexaInvite subscription and Razorpay payment support.
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="SubscriptionPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(choices=[("NORMAL", "Normal"), ("GOLD", "Gold"), ("DIAMOND", "Diamond")], max_length=10, unique=True)),
                ("name", models.CharField(max_length=80)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("amount", models.PositiveIntegerField(help_text="Amount in paise; 29900 means INR 299.00.")),
                ("currency", models.CharField(default="INR", max_length=3)),
                ("duration_days", models.PositiveSmallIntegerField(default=30)),
                ("features", models.JSONField(blank=True, default=list)),
                ("is_active", models.BooleanField(default=True)),
                ("display_order", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["display_order", "amount"]},
        ),
        migrations.CreateModel(
            name="Subscription",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("ACTIVE", "Active"), ("EXPIRED", "Expired"), ("CANCELLED", "Cancelled")], default="PENDING", max_length=12)),
                ("duration_days", models.PositiveSmallIntegerField(default=30, help_text="Duration captured when the order was created.")),
                ("starts_at", models.DateTimeField(blank=True, null=True)),
                ("ends_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("plan", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="subscriptions", to="subscriptions.subscriptionplan")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="subscriptions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("gateway_order_id", models.CharField(blank=True, max_length=80, null=True, unique=True)),
                ("gateway_payment_id", models.CharField(blank=True, max_length=80, null=True, unique=True)),
                ("amount", models.PositiveIntegerField()),
                ("currency", models.CharField(default="INR", max_length=3)),
                ("status", models.CharField(choices=[("CREATED", "Created"), ("AUTHORIZED", "Authorized"), ("CAPTURED", "Captured"), ("FAILED", "Failed"), ("REFUNDED", "Refunded")], default="CREATED", max_length=12)),
                ("failure_reason", models.CharField(blank=True, max_length=255)),
                ("gateway_payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("plan", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payments", to="subscriptions.subscriptionplan")),
                ("subscription", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="payment", to="subscriptions.subscription")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payments", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="WebhookEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_id", models.CharField(max_length=100, unique=True)),
                ("event_type", models.CharField(max_length=100)),
                ("processed", models.BooleanField(default=False)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("received_at", models.DateTimeField(auto_now_add=True)),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
            ],
        ),
        migrations.AddIndex(model_name="subscription", index=models.Index(fields=["user", "status"], name="sub_user_status_idx")),
        migrations.AddIndex(model_name="subscription", index=models.Index(fields=["status", "ends_at"], name="sub_status_ends_idx")),
        migrations.AddIndex(model_name="payment", index=models.Index(fields=["user", "created_at"], name="pay_user_created_idx")),
        migrations.AddIndex(model_name="payment", index=models.Index(fields=["status", "created_at"], name="pay_status_created_idx")),
    ]
