"""Small Razorpay REST adapter using the Python standard library."""
import base64
import hashlib
import hmac
import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class GatewayConfigurationError(Exception):
    pass


class GatewayError(Exception):
    pass


def _credentials():
    key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        raise GatewayConfigurationError("Razorpay is not configured. Set the API key ID and secret.")
    return key_id, key_secret


def create_order(*, amount: int, currency: str, receipt: str, notes: dict):
    key_id, key_secret = _credentials()
    token = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode()
    body = json.dumps({"amount": amount, "currency": currency, "receipt": receipt, "notes": notes}).encode()
    request = Request(
        "https://api.razorpay.com/v1/orders",
        data=body,
        headers={"Authorization": f"Basic {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode())
    except HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:500]
        raise GatewayError(f"Razorpay rejected the order request: {detail}") from exc
    except (URLError, TimeoutError, OSError) as exc:
        raise GatewayError("Could not reach Razorpay. Please try again.") from exc
    if (
        not result.get("id")
        or result.get("amount") != amount
        or result.get("currency") != currency
    ):
        raise GatewayError("Razorpay returned an order that does not match the requested amount and currency.")
    return result


def fetch_payment(payment_id: str):
    """Fetch the payment directly from Razorpay before granting paid access."""
    if not re.fullmatch(r"pay_[A-Za-z0-9]+", payment_id or ""):
        raise GatewayError("Invalid Razorpay payment ID.")
    key_id, key_secret = _credentials()
    token = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode()
    request = Request(
        f"https://api.razorpay.com/v1/payments/{payment_id}",
        headers={"Authorization": f"Basic {token}"},
        method="GET",
    )
    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode())
    except HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:500]
        raise GatewayError(f"Could not verify the Razorpay payment: {detail}") from exc
    except (URLError, TimeoutError, OSError) as exc:
        raise GatewayError("Could not reach Razorpay to verify the payment.") from exc


def verify_payment_signature(*, order_id: str, payment_id: str, signature: str) -> bool:
    _, key_secret = _credentials()
    message = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(key_secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")


def verify_webhook_signature(*, body: bytes, signature: str) -> bool:
    webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
    if not webhook_secret:
        raise GatewayConfigurationError("Razorpay webhook secret is not configured.")
    expected = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")
