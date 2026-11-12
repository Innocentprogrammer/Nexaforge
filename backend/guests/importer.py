"""CSV guest import: parse, pre-validate, de-duplicate, and report.

Kept out of ``views.py`` because Diamond's import is no longer a plain insert —
it decides which rows are safe to hand to Twilio, and the host has no
confirmation step in which to spot a bad file. The summary this returns is the
*only* chance to see what happened, so nothing is dropped silently: every row is
accounted for as imported-and-sent, collapsed-as-duplicate, or
rejected-for-format.

There is no per-guest tier column any more: the columns are
``full_name, email, phone_number, group_name`` (``phone`` still accepted as an
alias for ``phone_number``, for CSVs written before the rename).
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field

from django.db import transaction

from .models import E164_RE, Guest
from .phone import (
    INVALID_INDIAN_NUMBER_REASON,
    indian_national_digits,
    normalize_phone_number,
)


@dataclass
class ImportSummary:
    """What the host is shown after an upload. Every parsed row appears once."""

    guests: list = field(default_factory=list)
    #: Rows whose number collapsed onto an earlier row's: {name, phone_number,
    #: collapsed_onto (the name kept), reason}.
    duplicates: list[dict] = field(default_factory=list)
    #: Rows excluded from the send batch by the pre-normalisation format check:
    #: {name, phone_number (as typed), reason}.
    invalid_numbers: list[dict] = field(default_factory=list)
    #: Guest ids actually handed to send_diamond_invites (Diamond only).
    send_batch_ids: list[str] = field(default_factory=list)
    skipped_rows: int = 0

    def as_payload(self) -> dict:
        return {
            "imported": len(self.guests),
            "queued_for_send": len(self.send_batch_ids),
            "duplicates_collapsed": len(self.duplicates),
            "invalid_numbers": len(self.invalid_numbers),
            "skipped_rows": self.skipped_rows,
            "duplicates": self.duplicates,
            "rejected": self.invalid_numbers,
        }


class CSVImportError(ValueError):
    """The upload can't be read as a guest CSV at all — reported as a 400."""


#: Header spellings accepted for each column, after _normalize_header().
NAME_KEYS = ("full_name", "name", "guest_name", "fullname")
EMAIL_KEYS = ("email", "email_address", "e_mail", "mail")
PHONE_KEYS = ("phone_number", "phone", "mobile", "mobile_number", "phone_no", "contact", "contact_number", "whatsapp", "whatsapp_number")
GROUP_KEYS = ("group_name", "group", "category")


def _normalize_header(header: str | None) -> str:
    """'Full Name ' / 'full-name' / 'FULL_NAME' -> 'full_name'."""
    if not header:
        return ""
    return "_".join(header.strip().lower().replace("-", " ").replace("_", " ").split())


def _decode(raw: bytes) -> str:
    """Decode the upload, tolerating what spreadsheet apps actually save.

    Excel's "CSV" is Windows-1252 and its "Unicode text" is UTF-16; only
    accepting UTF-8 turned those into a 500.
    """
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        return raw.decode("utf-16")
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return raw.decode("cp1252", errors="replace")


def _reader(text: str) -> csv.DictReader:
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    headers = [_normalize_header(h) for h in (reader.fieldnames or [])]
    if not any(h in NAME_KEYS for h in headers):
        found = ", ".join(h for h in (reader.fieldnames or []) if h) or "none"
        raise CSVImportError(
            "Could not find a name column in the CSV. Expected headers: "
            f"full_name, email, phone_number, group_name. Found: {found}."
        )
    reader.fieldnames = headers
    return reader


def _cell(row: dict, *keys: str) -> str:
    for key in keys:
        value = row.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


MAX_REPORTED_ROW_ERRORS = 10


def import_guests_from_csv(invitation, file, *, build_send_batch: bool) -> ImportSummary:
    """Create a Guest per CSV row on `invitation`.

    **Name and phone number are mandatory.** The file is rejected outright
    (:class:`CSVImportError`, nothing imported) if either column is missing, or
    if any row has a blank name, a blank phone number, or a phone number that
    can't be read. Completely empty rows are ignored.

    **Duplicates are collapsed on every plan.** A row whose normalised phone
    number already belongs to a guest on this invitation — e.g. the same file
    uploaded twice — or to an earlier row in the same file is *not* created; it
    is listed under ``duplicates`` naming the guest it collapsed onto.

    ``build_send_batch`` (Diamond) additionally decides which of the *new*
    guests go to Twilio: a number that isn't a 10-digit Indian national number
    is still imported but excluded from the send batch and listed under
    ``invalid_numbers``.
    """
    # Parse and validate the whole file before creating anything, so a rejected
    # upload never leaves a half-imported guest list.
    reader = _reader(_decode(file.read()))
    if not any(h in PHONE_KEYS for h in reader.fieldnames):
        raise CSVImportError(
            "Could not find a phone number column in the CSV. Name and phone number "
            "are mandatory. Expected headers: full_name, email, phone_number, group_name."
        )

    parsed: list[dict] = []
    errors: list[str] = []
    skipped = 0
    # Row 1 is the header, so data rows start at 2 — matching the spreadsheet.
    for line_no, row in enumerate(reader, start=2):
        full_name = _cell(row, *NAME_KEYS)
        raw_phone = _cell(row, *PHONE_KEYS)
        if not full_name and not raw_phone and not any(
            isinstance(v, str) and v.strip() for v in row.values()
        ):
            skipped += 1
            continue

        missing = [label for label, value in (("name", full_name), ("phone number", raw_phone)) if not value]
        if missing:
            errors.append(f"Row {line_no}: missing {' and '.join(missing)}.")
            continue

        # Normalised here too: objects.create() runs no validators, so without
        # this a CSV could store a non-E.164 number the API would have rejected.
        phone = normalize_phone_number(raw_phone)
        if not E164_RE.match(phone):
            errors.append(f"Row {line_no}: could not read '{raw_phone}' as a phone number.")
            continue

        parsed.append(
            {
                "full_name": full_name,
                "email": _cell(row, *EMAIL_KEYS),
                "raw_phone": raw_phone,
                "phone": phone,
                "group_name": _cell(row, *GROUP_KEYS),
            }
        )

    if errors:
        shown = errors[:MAX_REPORTED_ROW_ERRORS]
        more = len(errors) - len(shown)
        raise CSVImportError(
            "File rejected — name and phone number are mandatory for every guest. "
            + " ".join(shown)
            + (f" …and {more} more row(s)." if more > 0 else "")
        )
    if not parsed:
        raise CSVImportError("The CSV file has no guest rows.")

    summary = ImportSummary(skipped_rows=skipped)
    #: normalised number -> name of the guest that already owns it.
    existing: dict[str, str] = {
        number: name
        for number, name in invitation.guests.exclude(phone_number="").values_list(
            "phone_number", "full_name"
        )
    }
    in_file: dict[str, str] = {}

    with transaction.atomic():
        for item in parsed:
            phone = item["phone"]
            owner = existing.get(phone) or in_file.get(phone)
            if owner:
                where = "already in the guest list" if phone in existing else "earlier in this file"
                summary.duplicates.append(
                    {
                        "full_name": item["full_name"],
                        "phone_number": phone,
                        "collapsed_onto": owner,
                        "reason": f"same number as {owner} ({where}) — not added again",
                    }
                )
                continue

            guest = Guest.objects.create(
                invitation=invitation,
                full_name=item["full_name"],
                email=item["email"],
                phone_number=phone,
                group_name=item["group_name"],
            )
            in_file[phone] = item["full_name"]
            summary.guests.append(guest)

            if not build_send_batch:
                continue

            if indian_national_digits(item["raw_phone"]) is None:
                summary.invalid_numbers.append(
                    {
                        "full_name": item["full_name"],
                        "phone_number": item["raw_phone"],
                        "reason": INVALID_INDIAN_NUMBER_REASON,
                    }
                )
                continue

            summary.send_batch_ids.append(str(guest.id))

    return summary
