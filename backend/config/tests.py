"""Tests for production settings enforcement, health checks and logging."""

import logging
import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase

from config.logging import JsonFormatter, RedactSecretsFilter, redact

BACKEND_DIR = Path(__file__).resolve().parent.parent
STRONG_KEY = "k" * 20 + "Zx9!q#Lm2$Vb7%Rt4^Wy6&Np8*Hd3(Fs" + "abcdefgh"  # 60 chars, varied

PRODUCTION_ENV = {
    "DJANGO_ENV": "production",
    "SECRET_KEY": STRONG_KEY,
    "DEBUG": "False",
    "ALLOWED_HOSTS": "api.nexainvite.example",
    "CORS_ALLOWED_ORIGINS": "https://nexainvite.example",
    "CACHE_URL": "redis://localhost:6379/1",
    "DATABASE_URL": "postgres://nexa:pw@localhost:5432/nexainvite",
    "SECURE_HSTS_INCLUDE_SUBDOMAINS": "True",
    "SECURE_HSTS_PRELOAD": "True",
}


def run_settings(env_overrides: dict, *args: str) -> subprocess.CompletedProcess:
    """Run manage.py in a fresh interpreter so settings are re-evaluated."""
    env = {**os.environ, **env_overrides}
    return subprocess.run(
        [sys.executable, "manage.py", *args],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )


class ProductionSettingsTests(SimpleTestCase):
    def test_valid_production_config_passes_deploy_checklist(self):
        result = run_settings(PRODUCTION_ENV, "check", "--deploy", "--fail-level", "WARNING")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("no issues", result.stdout)

    def assert_refuses(self, overrides: dict, expected: str):
        result = run_settings({**PRODUCTION_ENV, **overrides}, "check")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ImproperlyConfigured", result.stderr)
        self.assertIn(expected, result.stderr)

    def test_missing_secret_key_is_refused(self):
        self.assert_refuses({"SECRET_KEY": ""}, "SECRET_KEY")

    def test_known_development_key_is_refused(self):
        from config.settings import _DEV_SECRET_KEY

        self.assert_refuses({"SECRET_KEY": _DEV_SECRET_KEY}, "SECRET_KEY")

    def test_debug_true_is_refused(self):
        self.assert_refuses({"DEBUG": "True"}, "DEBUG must be False")

    def test_wildcard_hosts_are_refused(self):
        self.assert_refuses({"ALLOWED_HOSTS": "*"}, "ALLOWED_HOSTS")

    def test_missing_shared_cache_is_refused(self):
        self.assert_refuses({"CACHE_URL": ""}, "CACHE_URL")

    def test_plain_http_cors_origin_is_refused(self):
        self.assert_refuses({"CORS_ALLOWED_ORIGINS": "http://nexainvite.example"}, "CORS_ALLOWED_ORIGINS")

    def test_sqlite_is_refused(self):
        self.assert_refuses({"DATABASE_URL": ""}, "Production needs Postgres")

    def test_development_defaults_stay_usable(self):
        result = run_settings(
            {"DJANGO_ENV": "development"},
            "shell",
            "-c",
            "from django.conf import settings as s; "
            "print(s.DEBUG, s.SECURE_SSL_REDIRECT, s.SECURE_HSTS_SECONDS, s.SESSION_COOKIE_SECURE)",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("False 0 False", result.stdout)


class HealthCheckTests(TestCase):
    def test_liveness_needs_no_auth_and_ignores_host(self):
        response = self.client.get("/api/v1/health/", HTTP_HOST="internal-probe")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_readiness_reports_database(self):
        response = self.client.get("/api/v1/health/ready/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["checks"]["database"], "ok")

    def test_readiness_fails_closed_without_leaking_details(self):
        with patch("config.health._check_database", return_value=False):
            response = self.client.get("/api/v1/health/ready/")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable", "checks": {"database": "fail"}})

    def test_paths_work_without_trailing_slash(self):
        self.assertEqual(self.client.get("/api/v1/health").status_code, 200)
        response = self.client.get("/api/v1/health/ready")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["checks"]["database"], "ok")

    def test_other_methods_fall_through_to_normal_routing(self):
        response = self.client.post("/api/v1/health/")
        self.assertNotEqual(response.status_code, 200)


class RedactionTests(SimpleTestCase):
    def test_secrets_are_scrubbed(self):
        text = redact(
            "password=hunter2 Authorization: Bearer abcdef123456 "
            '{"refresh": "x", "access_token": "tok123456"} '
            "secret_key=s3cr3t https://app/invite/AbCdEfGhIjKlMnOp "
            "eyJhbGciOiJIUzI1.eyJ1c2VyX2lkIjo.c2lnbmF0dXJlX19f"
        )
        for leaked in ("hunter2", "abcdef123456", "tok123456", "s3cr3t", "AbCdEfGhIjKlMnOp", "eyJhbGci"):
            self.assertNotIn(leaked, text)

    def test_ordinary_text_is_untouched(self):
        self.assertEqual(redact("Guest Asha RSVP ACCEPTED for 3 people"), "Guest Asha RSVP ACCEPTED for 3 people")

    def test_filter_and_json_formatter(self):
        record = logging.LogRecord("t", logging.INFO, __file__, 1, "login with password=%s", ("hunter2",), None)
        RedactSecretsFilter().filter(record)
        output = JsonFormatter().format(record)
        self.assertNotIn("hunter2", output)
        self.assertIn('"level": "INFO"', output)


class CeleryFailureLoggingTests(SimpleTestCase):
    def test_failure_is_logged_without_task_arguments(self):
        from config.celery import _log_task_failure

        class FakeTask:
            name = "accounts.send_password_reset_email"

        with self.assertLogs("celery.tasks", level="ERROR") as logs:
            _log_task_failure(
                sender=FakeTask(),
                task_id="abc",
                exception=RuntimeError("smtp down"),
                args=("user-id", "https://app/reset-password?token=SECRET"),
            )
        joined = "\n".join(logs.output)
        self.assertIn("accounts.send_password_reset_email", joined)
        self.assertNotIn("SECRET", joined)
