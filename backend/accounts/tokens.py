"""Session helpers: tie JWTs to the user's current password.

Every token NexaInvite issues carries a ``pwv`` ("password version") claim — a
short keyed hash of the user's password hash. Authentication and token refresh
reject a token whose ``pwv`` no longer matches, so changing or resetting the
password signs the user out of every device at once: access tokens included,
which a refresh-token blacklist alone can't revoke before they expire.

The raw password hash never leaves the server; the claim is an HMAC of it under
SECRET_KEY, truncated, so it reveals nothing.
"""

from django.utils.crypto import salted_hmac

PASSWORD_VERSION_CLAIM = "pwv"


def password_version(user) -> str:
    return salted_hmac("nexainvite.session.pwv", user.password or "").hexdigest()[:16]


def token_matches_password(token, user) -> bool:
    return token.get(PASSWORD_VERSION_CLAIM) == password_version(user)


def revoke_all_sessions(user) -> int:
    """Blacklist every outstanding refresh token of `user`. Returns how many.

    Belt and braces next to the ``pwv`` check (which already invalidates them):
    this also makes the revocation visible in the token-blacklist admin.
    """
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    revoked = 0
    for outstanding in OutstandingToken.objects.filter(user=user):
        _, created = BlacklistedToken.objects.get_or_create(token=outstanding)
        revoked += int(created)
    return revoked
