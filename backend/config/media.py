"""Serve uploaded media from Django when there is no web server in front (Render).

Uses Django's static ``serve`` view (path traversal is rejected there) with the
same protective headers the bundled nginx config adds: uploads are only ever
JPEG/PNG/WEBP, and ``nosniff`` plus a sandbox CSP stop anything else from
being treated as a page.
"""

from django.conf import settings
from django.views.static import serve


def serve_media(request, path):
    response = serve(request, path, document_root=settings.MEDIA_ROOT, show_indexes=False)
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; sandbox"
    response["Cache-Control"] = "public, max-age=86400"
    return response
