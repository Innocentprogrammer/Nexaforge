import logging

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .tokens import token_matches_password

logger = logging.getLogger(__name__)


class PasswordAwareJWTAuthentication(JWTAuthentication):
    """JWT auth that rejects tokens issued before the user's last password change.

    See accounts/tokens.py. Tokens issued before this check existed carry no
    ``pwv`` claim and are rejected too, so every user logs in once more after
    this is deployed.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not token_matches_password(validated_token, user):
            raise AuthenticationFailed(
                "Your session has ended because your password was changed. Please log in again.",
                code="password_changed",
            )
        # Paid features follow the subscription's end date even if the scheduled
        # expiry job is not running (see subscriptions.tasks.expire_lapsed_for_user).
        from subscriptions.tasks import expire_lapsed_for_user

        try:
            expire_lapsed_for_user(user)
        except Exception:
            # Never block a request over this; the scheduled job will retry.
            logger.exception("Request-time subscription expiry check failed for user %s", user.pk)
        return user
