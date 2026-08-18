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

from .models import Guest
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


def _cell(row: dict, *keys: str) -> str:
    for key in keys:
        value = row.get(key)
        if value:
            return value.strip()
    return ""


def import_guests_from_csv(invitation, file, *, build_send_batch: bool) -> ImportSummary:
    """Create a Guest per CSV row on `invitation`.

    Every row with a name becomes a Guest — rows are never dropped, because the
    host would have no way to recover them. What ``build_send_batch`` (Diamond)
    controls is which of those guests are put in front of Twilio:

    * A row whose phone number is not a 10-digit Indian national number is
      **excluded from the send batch** by :func:`indian_national_digits` before
      ``normalize_phone_number`` or Twilio ever see it, and listed under
      ``invalid_numbers``. E.164 normalisation still runs on it for storage, and
      Twilio's own delivery-time errors remain the authority for numbers that
      pass this check.
    * If two rows carry the same normalised number, only the first is sent —
      one message, one InviteSendLog row — and the rest are listed under
      ``duplicates`` naming the row they collapsed onto.
    """
    summary = ImportSummary()
    reader = csv.DictReader(io.TextIOWrapper(file.file, encoding="utf-8-sig"))
    #: normalised number -> name of the guest that owns the send slot.
    claimed: dict[str, str] = {}

    for row in reader:
        full_name = _cell(row, "full_name", "name")
        if not full_name:
            summary.skipped_rows += 1
            continue

        raw_phone = _cell(row, "phone_number", "phone")
        # Normalised here too: objects.create() runs no validators, so without
        # this a CSV could store a non-E.164 number that the API would have
        # rejected — and that Twilio would later fail to send to.
        phone = normalize_phone_number(raw_phone)

        guest = Guest.objects.create(
            invitation=invitation,
            full_name=full_name,
            email=_cell(row, "email"),
            phone_number=phone,
            group_name=_cell(row, "group_name", "group"),
        )
        summary.guests.append(guest)

        if not build_send_batch:
            continue

        national = indian_national_digits(raw_phone)
        if national is None:
            summary.invalid_numbers.append(
                {
                    "full_name": full_name,
                    "phone_number": raw_phone,
                    "reason": INVALID_INDIAN_NUMBER_REASON,
                }
            )
            continue

        if national in claimed:
            summary.duplicates.append(
                {
                    "full_name": full_name,
                    "phone_number": phone or raw_phone,
                    "collapsed_onto": claimed[national],
                    "reason": (
                        f"same number as {claimed[national]} — sent once, to "
                        f"{claimed[national]}"
                    ),
                }
            )
            continue

        claimed[national] = full_name
        summary.send_batch_ids.append(str(guest.id))

    return summary
