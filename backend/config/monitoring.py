"""Optional error-monitoring hook (Sentry). Enabled only when SENTRY_DSN is set."""

import logging

logger = logging.getLogger(__name__)


def init_sentry(dsn: str, environment: str) -> bool:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.django import DjangoIntegration
    except ImportError:
        logger.warning("SENTRY_DSN is set but sentry-sdk is not installed; error monitoring is off.")
        return False

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        # Never ship personal data: no IPs, cookies, headers or request bodies.
        send_default_pii=False,
        max_request_body_size="never",
        traces_sample_rate=0.0,
    )
    return True
