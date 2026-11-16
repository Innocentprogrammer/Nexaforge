"""Structured logging helpers: a JSON formatter and a secret-redacting filter."""

import json
import logging
import re
from datetime import datetime, timezone

REDACTED = "[REDACTED]"

_PATTERNS: list[tuple[re.Pattern, str]] = [
    # Authorization headers / bearer tokens
    (re.compile(r"(?i)\b(bearer)\s+[A-Za-z0-9._~+/=-]{8,}"), rf"\1 {REDACTED}"),
    # JSON Web Tokens anywhere in a message
    (re.compile(r"eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}"), REDACTED),
    # key=value / "key": "value" pairs whose key names a secret
    (
        re.compile(
            r"(?i)([\"']?\b[\w-]*(?:password|passwd|secret|token|api[_-]?key|authorization|signature)"
            r"[\w-]*[\"']?\s*[:=]\s*[\"']?)([^\"'\s,;&}]+)"
        ),
        rf"\1{REDACTED}",
    ),
    # Per-guest invite links and password-reset links carry credentials in the path
    (re.compile(r"(/invite/)[A-Za-z0-9_-]{12,}"), rf"\1{REDACTED}"),
    (re.compile(r"(/reset-password\?)[^\s\"']+"), rf"\1{REDACTED}"),
]


def redact(text: str) -> str:
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class RedactSecretsFilter(logging.Filter):
    """Scrub secrets from the rendered message and any exception text."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            message = record.getMessage()
        except Exception:
            return True
        record.msg = redact(message)
        record.args = None
        if record.exc_info and not record.exc_text:
            record.exc_text = logging.Formatter().formatException(record.exc_info)
        if record.exc_text:
            record.exc_text = redact(record.exc_text)
        return True


class JsonFormatter(logging.Formatter):
    """One JSON object per line: timestamp, level, logger, message, context."""

    _STANDARD = set(vars(logging.LogRecord("", 0, "", 0, "", None, None))) | {"message", "asctime"}

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "time": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in vars(record).items():
            if key not in self._STANDARD and not key.startswith("_"):
                payload[key] = value if isinstance(value, (str, int, float, bool, type(None))) else str(value)
        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            payload["exception"] = redact(record.exc_text)
        return redact(json.dumps(payload, default=str))
