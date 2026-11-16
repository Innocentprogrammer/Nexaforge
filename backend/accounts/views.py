import logging

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from admin_portal.activity import Action, log_activity
from config.throttling import (
    LoginEmailThrottle,
    LoginIPThrottle,
    RegisterThrottle,
    TokenRefreshThrottle,
)

from .models import User
from .serializers import (
    EmailTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    PasswordAwareTokenRefreshSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    ResetTokenSerializer,
    UserSerializer,
)
from .tokens import revoke_all_sessions

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_activity(
            Action.USER_REGISTERED, actor=user, request=request, target=user,
            summary=f"{user.email} registered",
        )
        from notifications.services import create_notification
        create_notification(
            user=user,
            category="ACCOUNT",
            title="Welcome to NexaInvite",
            message="Your NexaInvite account is ready. Start by choosing a design and creating your first invitation.",
            action_url="/dashboard",
        )
        return Response(
            {
                "success": True,
                "message": "Registration successful.",
                "data": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginIPThrottle, LoginEmailThrottle]

    def post(self, request, *args, **kwargs):
        email = str(request.data.get("email", "")).strip()
        try:
            response = super().post(request, *args, **kwargs)
        except Exception:
            self._log_failure(request, email)
            raise
        if response.status_code == 200:
            user = User.objects.filter(email__iexact=email).first()
            if user:
                log_activity(
                    Action.USER_LOGIN, actor=user, request=request, target=user,
                    summary=f"{user.email} logged in",
                )
        else:
            self._log_failure(request, email)
        return response

    @staticmethod
    def _log_failure(request, email):
        # Only for real accounts: logging arbitrary typed emails would fill the
        # log with junk and record strangers' addresses.
        user = User.objects.filter(email__iexact=email).first() if email else None
        if user:
            log_activity(
                Action.USER_LOGIN_FAILED, actor=user, request=request, target=user,
                summary=f"Failed login for {user.email}",
            )


class RefreshView(TokenRefreshView):
    serializer_class = PasswordAwareTokenRefreshSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [TokenRefreshThrottle]


class LogoutView(APIView):
    """Revoke a refresh token.

    The refresh token in the body is the credential: holding it is what lets
    someone mint new access tokens, so holding it is enough to revoke it. That
    way logout still works when the access token has already expired (the
    client no longer has to refresh, and rotate, the very token it is about to
    revoke). If the request *also* carries a valid access token, it must belong
    to the same user as the refresh token.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [TokenRefreshThrottle]

    def post(self, request):
        refresh = request.data.get("refresh") if hasattr(request.data, "get") else None
        if not refresh or not isinstance(refresh, str):
            return Response(
                {"success": False, "message": "A refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh)
        except TokenError:
            # Expired, malformed or already revoked: it can't be used anyway.
            return Response({"success": True, "message": "Logged out."})

        user_id = token.payload.get(jwt_settings.USER_ID_CLAIM)
        user = User.objects.filter(**{jwt_settings.USER_ID_FIELD: user_id}).first()
        if request.user.is_authenticated and (user is None or request.user.pk != user.pk):
            return Response(
                {"success": False, "message": "This token does not belong to you."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            token.blacklist()
        except TokenError:
            pass
        if user is not None:
            log_activity(
                Action.USER_LOGOUT, actor=user, request=request, target=user,
                summary=f"{user.email} logged out",
            )
        return Response({"success": True, "message": "Logged out."})


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"success": True, "data": UserSerializer(request.user).data})

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        changed = sorted(serializer.validated_data.keys())
        if changed:
            log_activity(
                Action.PROFILE_UPDATED, request=request, target=request.user,
                summary=f"{request.user.email} updated their profile",
                metadata={"fields": changed},
            )
        return Response({"success": True, "data": serializer.data})


# --- Password recovery --------------------------------------------------------


class PasswordResetRateThrottle(AnonRateThrottle):
    """Per-IP limit on forgot/reset requests (settings: "password_reset")."""

    scope = "password_reset"


FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, we've sent a link to reset the password. "
    "Check your inbox (and spam folder)."
)


class ForgotPasswordView(APIView):
    """POST /auth/password/forgot/ {email}

    Always answers with the same message, whether or not the account exists, so
    the endpoint can't be used to discover which emails are registered.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True).first()
        if user is not None:
            from .tasks import send_password_reset_email

            try:
                # Only the user id crosses the broker; the task mints the link
                # itself, so the credential never sits in Redis or task logs.
                send_password_reset_email.delay(str(user.pk))
            except Exception:  # broker down etc. — still give the same answer
                logger.exception("Could not queue password reset email for user %s", user.pk)
            log_activity(
                Action.PASSWORD_RESET_REQUESTED, actor=user, request=request, target=user,
                summary=f"Password reset requested for {user.email}",
            )
        return Response({"success": True, "message": FORGOT_PASSWORD_MESSAGE})


class ValidateResetTokenView(APIView):
    """POST /auth/password/reset/validate/ {uid, token} — lets the reset page
    tell the user up front that a link is expired or used, before they type."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = ResetTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({"success": True, "data": {"email": serializer.validated_data["user"].email}})


class ResetPasswordView(APIView):
    """POST /auth/password/reset/ {uid, token, new_password, confirm_password}"""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        # Changing the password hash is what makes the reset link single-use
        # and (via the token's pwv claim) signs out every existing session.
        user.save(update_fields=["password", "updated_at"])
        revoke_all_sessions(user)
        log_activity(
            Action.PASSWORD_RESET_COMPLETED, actor=user, request=request, target=user,
            summary=f"{user.email} reset their password",
        )
        from notifications.services import create_notification

        create_notification(
            user=user,
            category="ACCOUNT",
            title="Your password was changed",
            message=(
                "Your NexaInvite password was just reset and you were signed out of all devices. "
                "If this wasn't you, reset your password again right away and contact support."
            ),
            action_url="/login",
            metadata={"event": "PASSWORD_RESET"},
        )
        return Response({"success": True, "message": "Your password has been reset. You can now log in."})
