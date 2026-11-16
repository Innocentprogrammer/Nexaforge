"""Phase 9 Stage 7: Render support (DATABASE_URL, media serving, request-info)."""
import tempfile
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import clear_url_caches, path
from rest_framework.test import APIClient

from accounts.models import User
from config.media import serve_media
from config.settings import _postgres_from_url

MEDIA_DIR = Path(tempfile.mkdtemp(prefix="nexainvite-media-view-"))
(MEDIA_DIR / "user-media").mkdir()
(MEDIA_DIR / "user-media" / "pic.png").write_bytes(b"\x89PNG\r\n\x1a\nfake")
(MEDIA_DIR.parent / "outside-secret.txt").write_text("nope")

urlpatterns = [path("media/<path:path>", serve_media)]


class DatabaseUrlTests(SimpleTestCase):
    def test_render_style_url(self):
        db = _postgres_from_url("postgresql://nexa:p%40ss@dpg-abc-a:5432/nexainvite")
        self.assertEqual(db["ENGINE"], "django.db.backends.postgresql")
        self.assertEqual((db["USER"], db["PASSWORD"], db["HOST"], db["PORT"], db["NAME"]),
                         ("nexa", "p@ss", "dpg-abc-a", "5432", "nexainvite"))
        self.assertNotIn("OPTIONS", db)

    def test_default_port_and_options(self):
        db = _postgres_from_url("postgres://u:p@host/db?sslmode=require")
        self.assertEqual(db["PORT"], "5432")
        self.assertEqual(db["OPTIONS"], {"sslmode": "require"})

    def test_rejects_other_schemes(self):
        with self.assertRaises(ImproperlyConfigured):
            _postgres_from_url("mysql://u:p@h/db")


@override_settings(ROOT_URLCONF=__name__, MEDIA_ROOT=MEDIA_DIR)
class MediaViewTests(SimpleTestCase):
    def setUp(self):
        clear_url_caches()

    def test_serves_file_with_safe_headers(self):
        r = self.client.get("/media/user-media/pic.png")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["X-Content-Type-Options"], "nosniff")
        self.assertIn("sandbox", r["Content-Security-Policy"])

    def test_missing_and_traversal_are_404(self):
        self.assertEqual(self.client.get("/media/user-media/none.png").status_code, 404)
        for url in ("/media/../outside-secret.txt", "/media/%2e%2e/outside-secret.txt",
                    "/media/user-media/../../outside-secret.txt"):
            r = self.client.get(url)
            self.assertIn(r.status_code, (400, 404), url)
            self.assertNotIn(b"nope", b"".join(getattr(r, "streaming_content", [r.content])))
        self.assertEqual(self.client.get("/media/user-media/").status_code, 404)  # no listings


class RequestInfoTests(TestCase):
    URL = "/api/v1/admin/request-info/"

    def test_staff_only(self):
        client = APIClient()
        self.assertEqual(client.get(self.URL).status_code, 401)
        user = User.objects.create_user(username="u@example.com", email="u@example.com", password="StrongPass123!")
        client.force_authenticate(user)
        self.assertEqual(client.get(self.URL).status_code, 403)

    @override_settings(NUM_PROXIES=2)
    def test_reports_forwarding_chain(self):
        staff = User.objects.create_user(
            username="s@example.com", email="s@example.com", password="StrongPass123!", is_staff=True
        )
        client = APIClient()
        client.force_authenticate(staff)
        r = client.get(self.URL, HTTP_X_FORWARDED_FOR="9.9.9.9, 203.0.113.7, 10.0.0.2")
        self.assertEqual(r.status_code, 200)
        data = r.data["data"]
        self.assertEqual(data["x_forwarded_for"], ["9.9.9.9", "203.0.113.7", "10.0.0.2"])
        self.assertEqual(data["resolved_client_ip"], "203.0.113.7")
        self.assertEqual(data["num_proxies"], 2)
