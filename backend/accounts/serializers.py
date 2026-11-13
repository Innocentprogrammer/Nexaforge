from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .tokens import PASSWORD_VERSION_CLAIM, password_version, token_matches_password


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

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Ties the session to the current password (accounts/tokens.py).
        token[PASSWORD_VERSION_CLAIM] = password_version(user)
        return token

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
            "is_staff",
            "profile_image",
            "created_at",
        ]
        # subscription_tier is read-only: only verified payment processing or
        # authorized administrative actions may grant a paid tier.
        read_only_fields = [
            "id",
            "email",
            "role",
            "subscription_tier",
            "is_verified",
            "is_staff",
            "created_at",
        ]


class PasswordAwareTokenRefreshSerializer(TokenRefreshSerializer):
    """Refuses to refresh a session started before the last password change."""

    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])  # raises TokenError if invalid/blacklisted
        user = User.objects.filter(pk=refresh.get("user_id"), is_active=True).first()
        if user is None or not token_matches_password(refresh, user):
            raise InvalidToken("Your session has ended. Please log in again.")
        return super().validate(attrs)


# --- Password reset ---------------------------------------------------------

INVALID_RESET_LINK = "This password reset link is invalid or has expired. Please request a new one."


def make_reset_params(user) -> tuple[str, str]:
    """(uid, token) for a reset link. The token embeds a timestamp and the
    current password hash, so it expires after PASSWORD_RESET_TIMEOUT and stops
    working as soon as the password changes — i.e. it is single-use."""
    return urlsafe_base64_encode(force_bytes(user.pk)), default_token_generator.make_token(user)


def user_for_reset(uid: str, token: str):
    try:
        pk = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=pk, is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None
    return user if default_token_generator.check_token(user, token) else None


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetTokenSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, attrs):
        user = user_for_reset(attrs["uid"], attrs["token"])
        if user is None:
            raise serializers.ValidationError({"non_field_errors": [INVALID_RESET_LINK]}, code="invalid_link")
        attrs["user"] = user
        return attrs


class ResetPasswordSerializer(ResetTokenSerializer):
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        try:
            validate_password(attrs["new_password"], user=attrs["user"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)})
        return attrs
