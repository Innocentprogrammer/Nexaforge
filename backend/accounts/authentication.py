from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .tokens import token_matches_password


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
        return user
