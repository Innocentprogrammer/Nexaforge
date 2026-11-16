"""Rate limits for public and abuse-prone endpoints.

Rates live in ``REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`` (config/settings.py).
Client identity comes from DRF's ``get_ident``, which honours ``NUM_PROXIES`` so
a forged ``X-Forwarded-For`` cannot reset the counter. Counters are stored in
the default cache, which must be shared (Redis) in production so every worker
counts the same requests.
"""

import hashlib

from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class IPRateThrottle(SimpleRateThrottle):
    """Per-client-IP limit that applies to anonymous and signed-in callers alike."""

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginIPThrottle(IPRateThrottle):
    scope = "login"


class LoginEmailThrottle(SimpleRateThrottle):
    """Per-account limit on login attempts, so rotating IPs can't brute-force one
    password. The email is hashed so the cache never holds addresses."""

    scope = "login_email"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email", "")).strip().lower() if hasattr(request.data, "get") else ""
        if not email:
            return None
        digest = hashlib.sha256(email.encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}


class RegisterThrottle(IPRateThrottle):
    scope = "register"


class TokenRefreshThrottle(IPRateThrottle):
    scope = "token_refresh"


class RSVPThrottle(IPRateThrottle):
    scope = "rsvp"


class PublicPageThrottle(IPRateThrottle):
    """Public invitation pages and per-guest invite links."""

    scope = "public_page"


class PaymentOrderThrottle(UserRateThrottle):
    """Per-account limit on creating Razorpay orders."""

    scope = "payment_order"
