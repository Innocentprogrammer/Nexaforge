from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("templates_app.urls")),
    path("api/v1/", include("invitations.urls")),
    path("api/v1/", include("guests.urls")),
    path("api/v1/", include("rsvp.urls")),
    path("api/v1/", include("products.urls")),
    path("api/v1/", include("leads.urls")),
    path("api/v1/", include("subscriptions.urls")),
    path("api/v1/", include("media_manager.urls")),
    path("api/v1/", include("notifications.urls")),
    path("api/v1/admin/", include("admin_portal.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
