"""Client IP resolution that only trusts forwarding headers from known proxies.

``X-Forwarded-For`` is set by whoever sends the request, so its *first* entry is
attacker-controlled. Each trusted reverse proxy appends the address it received
the connection from, so with ``NUM_PROXIES`` proxies in front of the app the
real client is the ``NUM_PROXIES``-th address from the *right*. With
``NUM_PROXIES = 0`` (local development, no proxy) the header is ignored entirely
and the socket address is used.

This mirrors Django REST Framework's throttle identification (``NUM_PROXIES``
in ``REST_FRAMEWORK``), so rate limits and the activity log agree on who a
client is.
"""

from ipaddress import ip_address

from django.conf import settings


def client_ip(request) -> str | None:
    """Return the validated client IP for ``request``, or None if unknown."""
    if request is None:
        return None
    meta = request.META
    remote_addr = meta.get("REMOTE_ADDR", "")
    num_proxies = getattr(settings, "NUM_PROXIES", 0)
    forwarded = meta.get("HTTP_X_FORWARDED_FOR", "")

    raw = remote_addr
    if num_proxies and forwarded:
        addresses = [part.strip() for part in forwarded.split(",") if part.strip()]
        if addresses:
            raw = addresses[-min(num_proxies, len(addresses))]

    try:
        return str(ip_address(raw)) if raw else None
    except ValueError:
        return None
