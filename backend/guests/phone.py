"""Normalise the phone numbers people actually type into E.164.

Guests are entered by hand and pasted from spreadsheets, so requiring a
fully-formed "+919876543210" at the input boundary just produces a 400 for the
common case. Instead we accept the usual local spellings and normalise; only
genuinely ambiguous input is rejected.
"""

import re

from django.conf import settings

_NON_DIGIT = re.compile(r"[^\d+]")


def default_country_code() -> str:
    code = getattr(settings, "GUEST_DEFAULT_COUNTRY_CODE", "+91") or ""
    return code if code.startswith("+") else f"+{code}"


def normalize_phone_number(raw: str) -> str:
    """Best-effort E.164 normalisation. Returns "" for empty input.

    Handles, in order:
      "+91 98765-43210" / "(+91) 98765 43210"  -> +919876543210  (already E.164)
      "0091 9876543210"                        -> +919876543210  (00 = intl prefix)
      "09876543210"                            -> +919876543210  (0 = trunk prefix)
      "9876543210"                             -> +919876543210  (bare national)

    Anything it can't confidently place is returned stripped-but-unchanged, so
    the model's E164_VALIDATOR still rejects it with a clear message rather than
    this function silently inventing a country code.
    """
    if not raw:
        return ""

    cleaned = _NON_DIGIT.sub("", raw.strip())
    if not cleaned:
        return raw.strip()

    # A "+" anywhere but the front is a typo, not a country code.
    if "+" in cleaned:
        cleaned = "+" + cleaned.replace("+", "")

    if cleaned.startswith("+"):
        return cleaned

    if cleaned.startswith("00"):
        return "+" + cleaned[2:]

    cc = default_country_code()
    digits = cleaned

    # National trunk prefix: 0XXXXXXXXXX -> drop the 0 before adding the code.
    if digits.startswith("0"):
        digits = digits.lstrip("0")

    # Only add a country code to something that plausibly *is* a bare national
    # number. Too short/long and we'd be guessing, so hand it to the validator.
    if not (7 <= len(digits) <= 12):
        return cleaned

    return f"{cc}{digits}"


#: Length of an Indian national subscriber number, sans country/trunk prefix.
INDIAN_NATIONAL_LENGTH = 10

INVALID_INDIAN_NUMBER_REASON = (
    "not sent — invalid number format (expected a 10-digit Indian number, "
    "optionally prefixed with +91, 0091 or 0)"
)


def indian_national_digits(raw: str) -> str | None:
    """Return the bare 10-digit Indian national number, or None if it isn't one.

    A **pre-filter**, not a replacement for anything: it runs *before*
    :func:`normalize_phone_number` so obviously-unsendable values never reach
    E.164 normalisation or Twilio. E.164 normalisation still runs afterwards on
    everything that passes, and Twilio's own delivery-time errors (63003, 63024,
    63015 …) are still the authority on whether a number can actually be
    reached.

    Accepted, after stripping spaces, dashes, brackets and any other
    non-digits::

        9876543210        -> 9876543210
        098765 43210      -> 9876543210   (leading trunk 0)
        +91 98765-43210   -> 9876543210   (country code)
        0091-9876543210   -> 9876543210   (international 00 prefix)

    Rejected (returns None): anything that isn't exactly 10 digits once those
    prefixes are removed — too short, too long, empty, or a non-Indian country
    code such as ``+1 415 555 2671``.

    **This is intentionally India-only.** Diamond sends are gated on it, so a
    genuinely international guest number will be excluded from the send batch.
    Widening this is a deliberate product decision, not a bug fix.
    """
    if not raw:
        return None

    digits = _NON_DIGIT.sub("", raw.strip()).replace("+", "")
    if not digits:
        return None

    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) > INDIAN_NATIONAL_LENGTH and digits.startswith("91"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = digits.lstrip("0")

    return digits if len(digits) == INDIAN_NATIONAL_LENGTH and digits.isdigit() else None
