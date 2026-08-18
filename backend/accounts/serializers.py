from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["full_name", "email", "phone", "password", "confirm_password"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        email = validated_data["email"]
        user = User(username=email, **validated_data)
        user.set_password(password)
        user.save()
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Allows login with email+password while USERNAME_FIELD stays email-based."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "role",
            "subscription_tier",
            "is_verified",
            "profile_image",
            "created_at",
        ]
        # subscription_tier is read-only on purpose: there is no billing yet, so
        # a writable field would let any account grant itself Gold/Diamond. Move
        # accounts with `manage.py set_subscription_tier` or the Django admin.
        read_only_fields = [
            "id",
            "email",
            "role",
            "subscription_tier",
            "is_verified",
            "created_at",
        ]
