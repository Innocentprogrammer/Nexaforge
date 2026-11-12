"""
Django settings for NexaInvite backend (config project).
"""

from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config(
    "SECRET_KEY",
    default="django-insecure-fh&a06atm)-0)f^srqu4$v(*=ch@=rf%)6*2s8k5t^tf%c&5oz",
)

DEBUG = config("DEBUG", default=True, cast=bool)

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1,0.0.0.0", cast=Csv())

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    # local apps
    "accounts",
    "templates_app",
    "invitations",
    "guests",
    "rsvp",
    "products",
    "leads",
    "subscriptions",
    "media_manager",
    "notifications",
    "admin_portal",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database
# Defaults to SQLite for zero-config local dev. Set DB_ENGINE=postgres (see
# docker-compose.yml) to match the production Postgres target from
# Documentation/Technology-Stack.MD and Database Design.MD.
if config("DB_ENGINE", default="sqlite") == "postgres":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME", default="nexainvite"),
            "USER": config("DB_USER", default="nexainvite"),
            "PASSWORD": config("DB_PASSWORD", default="nexainvite"),
            "HOST": config("DB_HOST", default="localhost"),
            "PORT": config("DB_PORT", default="5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_RATES": {"leads": "5/hour"},
}

# SimpleJWT - matches API Specification.MD "JWT + Refresh Tokens"
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# CORS - allow the Next.js dev server
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000",
    cast=Csv(),
)
# Lets the browser read the download filename off the gold-links CSV response.
CORS_EXPOSE_HEADERS = ["Content-Disposition"]

# Public base URL of the Next.js app - used to build per-guest invite links
# ({FRONTEND_URL}/invite/{token}) for the gold-tier CSV export and diamond sends.
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000").rstrip("/")

# Country code applied when a guest's phone number is entered as a bare national
# number (e.g. "9876543210" -> "+919876543210"). Numbers already carrying a "+"
# or a "00" international prefix are left alone.
GUEST_DEFAULT_COUNTRY_CODE = config("GUEST_DEFAULT_COUNTRY_CODE", default="+91")

# Celery - Redis broker (see docker-compose.yml `redis` service).
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = config("CELERY_RESULT_BACKEND", default=CELERY_BROKER_URL)
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = TIME_ZONE
# Local dev has no worker running by default: run tasks inline in the request
# instead of enqueueing into a broker nobody is draining. Set to False (and start
# `celery -A config worker`) for real async behaviour.
CELERY_TASK_ALWAYS_EAGER = config("CELERY_TASK_ALWAYS_EAGER", default=True, cast=bool)
CELERY_TASK_EAGER_PROPAGATES = False
CELERY_BEAT_SCHEDULE = {
    "expire-nexainvite-subscriptions-daily": {
        "task": "subscriptions.tasks.expire_subscriptions",
        "schedule": 60 * 60 * 24,
    },
    "notify-nexainvite-subscription-expiry-daily": {
        "task": "subscriptions.tasks.send_subscription_expiry_reminders",
        "schedule": 60 * 60 * 24,
    },
}

# Twilio (Feature 2 - diamond-tier WhatsApp/SMS invites).
# Backend selection: "twilio" hits the real API, "console" logs the payload and
# simulates a result - used by local dev and the end-to-end test.
INVITE_SEND_BACKEND = config("INVITE_SEND_BACKEND", default="console")
# console backend only: comma-separated numbers to treat as not-on-WhatsApp, so
# the SMS fallback path can be exercised without a live Twilio account.
INVITE_SEND_CONSOLE_UNREACHABLE = config("INVITE_SEND_CONSOLE_UNREACHABLE", default="")
TWILIO_ACCOUNT_SID = config("NEXAINVITE_TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = config("NEXAINVITE_TWILIO_AUTH_TOKEN", default="")
TWILIO_WHATSAPP_FROM = config("NEXAINVITE_TWILIO_WHATSAPP_FROM", default="")
TWILIO_SMS_FROM = config("NEXAINVITE_TWILIO_SMS_FROM", default="")
TWILIO_TEMPLATE_SID = config("NEXAINVITE_TWILIO_TEMPLATE_SID", default="")

# Seconds to wait between sends so a large diamond list doesn't trip Twilio's
# per-account message rate limit.
INVITE_SEND_DELAY_SECONDS = config("INVITE_SEND_DELAY_SECONDS", default=1.0, cast=float)

# After a WhatsApp send is accepted, poll its delivery status this many times at
# this interval before giving up and keeping the optimistic result. Needed
# because 63015/63024 are reported asynchronously, after messages.create()
# has already returned success - without the wait, the SMS fallback never fires.
INVITE_SEND_CONFIRM_ATTEMPTS = config("INVITE_SEND_CONFIRM_ATTEMPTS", default=6, cast=int)
INVITE_SEND_CONFIRM_INTERVAL = config("INVITE_SEND_CONFIRM_INTERVAL", default=2.0, cast=float)

# Send an SMS copy even when the WhatsApp send succeeded. Off by default: double
# delivery doubles both cost and message volume for guests who are on WhatsApp.
INVITE_SEND_DUPLICATE_SMS = config("INVITE_SEND_DUPLICATE_SMS", default=False, cast=bool)

# Razorpay. Keep all secrets in backend/.env; never expose the secret to the browser.
RAZORPAY_KEY_ID = config("RAZORPAY_KEY_ID", default="")
RAZORPAY_KEY_SECRET = config("RAZORPAY_KEY_SECRET", default="")
RAZORPAY_WEBHOOK_SECRET = config("RAZORPAY_WEBHOOK_SECRET", default="")

# Email notifications. Console backend is safe for local development; configure
# SMTP credentials in backend/.env for real delivery.
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_USE_SSL = config("EMAIL_USE_SSL", default=False, cast=bool)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="NexaInvite <no-reply@nexainvite.com>")
