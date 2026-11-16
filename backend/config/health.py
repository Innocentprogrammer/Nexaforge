"""Health-check endpoints for load balancers and container orchestration.

* ``GET /api/v1/health/``        liveness: the process is up. No dependencies touched.
* ``GET /api/v1/health/ready/``  readiness: database (and cache / Celery broker
  when they are in use) answer. 503 if any check fails.

Served from middleware placed first in ``MIDDLEWARE`` so that probes work before
host validation (a container probe uses ``Host: localhost``, which production
ALLOWED_HOSTS rejects) and before the HTTPS redirect (probes speak plain HTTP
inside the private network). Responses carry only pass/fail per component;
failure details go to the server log, never to the caller.
"""

import logging

from django.conf import settings
from django.db import connection
from django.http import JsonResponse

logger = logging.getLogger(__name__)

LIVE_PATH = "/api/v1/health/"
READY_PATH = "/api/v1/health/ready/"


def _check_database() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except Exception:
        logger.exception("Readiness check failed: database")
        return False


def _check_cache() -> bool | None:
    backend = settings.CACHES.get("default", {}).get("BACKEND", "") if hasattr(settings, "CACHES") else ""
    if "locmem" in backend.lower() or "dummy" in backend.lower() or not backend:
        return None  # in-process cache, nothing external to probe
    try:
        from django.core.cache import cache

        cache.set("health:probe", "1", timeout=5)
        return cache.get("health:probe") == "1"
    except Exception:
        logger.exception("Readiness check failed: cache")
        return False


def _check_broker() -> bool | None:
    if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        return None  # tasks run inline; no broker in use
    try:
        from config.celery import app

        with app.connection_for_write() as conn:
            conn.ensure_connection(max_retries=1, timeout=2)
        return True
    except Exception:
        logger.exception("Readiness check failed: Celery broker")
        return False


def readiness() -> tuple[bool, dict]:
    checks = {"database": _check_database(), "cache": _check_cache(), "broker": _check_broker()}
    reported = {name: ("ok" if ok else "fail") for name, ok in checks.items() if ok is not None}
    return all(ok is not False for ok in checks.values()), reported


class HealthCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in ("GET", "HEAD"):
            # Accept the path with or without the trailing slash: these URLs are
            # not in the URLconf, so Django's APPEND_SLASH redirect can't apply.
            path = request.path.rstrip("/") + "/"
            if path == LIVE_PATH:
                return JsonResponse({"status": "ok"})
            if path == READY_PATH:
                ok, checks = readiness()
                return JsonResponse(
                    {"status": "ok" if ok else "unavailable", "checks": checks},
                    status=200 if ok else 503,
                )
        return self.get_response(request)
