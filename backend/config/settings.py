"""
Django settings for NexaInvite backend (config project).
"""

from datetime import timedelta
import sys
from pathlib import Path

from decouple import Csv, config
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Environment. "development" (default) keeps the zero-config local setup;
# "production" enforces every setting below and refuses to start without them.
# ---------------------------------------------------------------------------
DJANGO_ENV = config("DJANGO_ENV", default="development").strip().lower()
if DJANGO_ENV not in {"development", "production"}:
    raise ImproperlyConfigured("DJANGO_ENV must be 'development' or 'production'.")
IS_PRODUCTION = DJANGO_ENV == "production"
#: True while `manage.py test` runs (used to switch off rate limiting in tests).
TESTING = len(sys.argv) > 1 and sys.argv[1] == "test"

# Development-only fallback. It is public (it lives in this file), so production
# rejects it; it is kept for development so existing local sessions keep working.
_DEV_SECRET_KEY = "django-insecure-fh&a06atm)-0)f^srqu4$v(*=ch@=rf%)6*2s8k5t^tf%c&5oz"
SECRET_KEY = config("SECRET_KEY", default="" if IS_PRODUCTION else _DEV_SECRET_KEY)
if IS_PRODUCTION and (
    not SECRET_KEY
    or SECRET_KEY == _DEV_SECRET_KEY
    or SECRET_KEY.startswith("django-insecure")
    or len(SECRET_KEY) < 50
    or len(set(SECRET_KEY)) < 5
):
    raise ImproperlyConfigured(
        "Production needs a strong SECRET_KEY (50+ random characters). Generate one with: "
        "python -c \"from django.core.management.utils import get_random_secret_key; "
        "print(get_random_secret_key())\""
    )

DEBUG = config("DEBUG", default=not IS_PRODUCTION, cast=bool)
if IS_PRODUCTION and DEBUG:
    raise ImproperlyConfigured("DEBUG must be False when DJANGO_ENV=production.")

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="" if IS_PRODUCTION else "localhost,127.0.0.1,0.0.0.0",
    cast=Csv(),
)
# Render sets this to the service's own *.onrender.com name.
_RENDER_HOST = config("RENDER_EXTERNAL_HOSTNAME", default="")
if _RENDER_HOST and _RENDER_HOST not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_RENDER_HOST)
if IS_PRODUCTION and (not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS):
    raise ImproperlyConfigured(
        "Production needs an explicit ALLOWED_HOSTS list (no '*'), e.g. api.nexainvite.com."
    )

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
    # Revocable refresh tokens: logout and password reset blacklist them.
    "rest_framework_simplejwt.token_blacklist",
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
    # First: answers /api/v1/health/ and /api/v1/health/ready/ before host
    # validation and the HTTPS redirect, so container health checks work.
    "config.health.HealthCheckMiddleware",
    "django.middleware.security.SecurityMiddleware",
    # Serves collected static files (Django admin CSS/JS) in production.
    "whitenoise.middleware.WhiteNoiseMiddleware",
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
# Defaults to SQLite for zero-config local dev. Production uses Postgres, given
# either as one DATABASE_URL (Render: the database's internal connection string)
# or as DB_ENGINE=postgres plus DB_* parts (docker-compose.yml).
def _postgres_from_url(url: str) -> dict:
    from urllib.parse import parse_qs, unquote, urlsplit

    parts = urlsplit(url)
    if parts.scheme not in {"postgres", "postgresql"}:
        raise ImproperlyConfigured("DATABASE_URL must start with postgres:// or postgresql://")
    db = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parts.path.lstrip("/")),
        "USER": unquote(parts.username or ""),
        "PASSWORD": unquote(parts.password or ""),
        "HOST": parts.hostname or "",
        "PORT": str(parts.port or 5432),
    }
    options = {key: values[-1] for key, values in parse_qs(parts.query).items()}
    if options:
        db["OPTIONS"] = options  # e.g. ?sslmode=require
    return db


DATABASE_URL = config("DATABASE_URL", default="")
if DATABASE_URL:
    DATABASES = {"default": _postgres_from_url(DATABASE_URL)}
elif config("DB_ENGINE", default="sqlite") == "postgres":
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
if DATABASES["default"]["ENGINE"].endswith("postgresql"):
    # Reuse connections between requests; check them before use.
    DATABASES["default"]["CONN_MAX_AGE"] = config("DB_CONN_MAX_AGE", default=60, cast=int)
    DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
if IS_PRODUCTION and not DATABASES["default"]["ENGINE"].endswith("postgresql"):
    raise ImproperlyConfigured("Production needs Postgres: set DATABASE_URL or DB_ENGINE=postgres.")

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
# Render: the persistent disk's mount path, e.g. /var/data/media.
MEDIA_ROOT = Path(config("MEDIA_ROOT", default=str(BASE_DIR / "media")))
# Serve uploaded media from Django itself. Needed on Render (no nginx in front);
# the bundled docker-compose stack leaves it off because nginx serves /media/.
SERVE_MEDIA = config("SERVE_MEDIA", default=DEBUG, cast=bool)
if TESTING:
    # Tests upload images; keep them out of the real media folder.
    import tempfile

    MEDIA_ROOT = Path(tempfile.mkdtemp(prefix="nexainvite-test-media-"))

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    # Production: hashed, compressed files served by WhiteNoise (requires
    # `manage.py collectstatic`). Development: plain files, no build step.
    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage.CompressedManifestStaticFilesStorage"
            if IS_PRODUCTION
            else "django.contrib.staticfiles.storage.StaticFilesStorage"
        )
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        # JWT auth that also rejects tokens from before the last password change.
        "accounts.authentication.PasswordAwareJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    # See config/throttling.py. Generous where real people share one IP
    # (wedding guests on venue Wi-Fi), strict where guessing is the threat.
    "DEFAULT_THROTTLE_RATES": {
        "leads": "5/hour",
        "password_reset": "10/hour",
        "login": "20/min",            # per IP
        "login_email": "20/hour",     # per account, across all IPs
        "register": "10/hour",        # per IP
        "token_refresh": "120/min",   # per IP; several tabs refresh together
        "rsvp": "60/hour",            # per IP
        "public_page": "300/min",     # per IP; invitation pages and invite links
        "payment_order": "20/hour",   # per user
    },
}

# Number of trusted reverse proxies in front of Django. Client IPs (rate limits,
# activity log) are read from X-Forwarded-For only up to this many hops; with 0
# the header is ignored. 0 for local runserver; 1 behind the bundled nginx; add
# one per extra proxy/load balancer (e.g. 2 behind a cloud LB + nginx).
NUM_PROXIES = config("NUM_PROXIES", default=1 if IS_PRODUCTION else 0, cast=int)
REST_FRAMEWORK["NUM_PROXIES"] = NUM_PROXIES

# Cache. Rate-limit counters live here, so production needs a cache shared by
# every worker (Redis); a per-process cache would multiply every limit by the
# number of workers. Tests use a dummy cache so throttles never trip between
# unrelated tests; throttle tests enable a real cache explicitly.
CACHE_URL = config("CACHE_URL", default="")
if IS_PRODUCTION and not CACHE_URL:
    raise ImproperlyConfigured(
        "Production needs CACHE_URL (e.g. redis://:password@redis:6379/1) so rate limits "
        "are shared across workers."
    )
if TESTING:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}}
elif CACHE_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": CACHE_URL,
            "KEY_PREFIX": "nexainvite",
        }
    }
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# SimpleJWT - matches API Specification.MD "JWT + Refresh Tokens"
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    # Kept off: several open tabs refresh concurrently, and blacklisting the old
    # token on rotation would log the slower tab out. Logout and password reset
    # revoke tokens explicitly instead.
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Password reset links (accounts.ForgotPasswordView) expire after this many seconds.
PASSWORD_RESET_TIMEOUT = config("PASSWORD_RESET_TIMEOUT", default=60 * 60, cast=int)

# CORS - allow the Next.js dev server
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000",
    cast=Csv(),
)
CORS_ALLOW_ALL_ORIGINS = False
if IS_PRODUCTION:
    _bad = [o for o in CORS_ALLOWED_ORIGINS if o == "*" or not o.startswith("https://")]
    if not CORS_ALLOWED_ORIGINS or _bad:
        raise ImproperlyConfigured(
            "Production needs explicit https:// CORS_ALLOWED_ORIGINS (no '*'); got "
            f"{CORS_ALLOWED_ORIGINS or 'nothing'}."
        )
# Lets the browser read the download filename off the gold-links CSV response.
CORS_EXPOSE_HEADERS = ["Content-Disposition"]

# Origins allowed to send unsafe requests carrying the CSRF cookie (Django admin,
# and the cookie-based auth planned for a later stage). Defaults to the CORS list.
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS", default=",".join(CORS_ALLOWED_ORIGINS), cast=Csv()
)

# ---------------------------------------------------------------------------
# HTTP security. Headers are safe everywhere; HTTPS-only behaviour is enabled
# in production only, so local http:// development keeps working.
# ---------------------------------------------------------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

if IS_PRODUCTION:
    SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
    # Behind the TLS-terminating reverse proxy, trust its X-Forwarded-Proto so
    # Django knows the original request was HTTPS. Only safe when the proxy
    # overwrites this header (the bundled nginx config does); disable otherwise.
    if config("TRUST_X_FORWARDED_PROTO", default=True, cast=bool):
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Start low and raise to 31536000 once HTTPS is confirmed working everywhere:
    # browsers cache HSTS, so a mistake here locks users out for the whole period.
    SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=3600, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = config(
        "SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False, cast=bool
    )
    SECURE_HSTS_PRELOAD = config("SECURE_HSTS_PRELOAD", default=False, cast=bool)

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

# Reliability (only affects a real worker; eager mode ignores these).
# Acknowledge a task only after it finishes, so a worker crash re-queues it
# instead of losing it. Safe because the email tasks check "already SENT" first.
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
# Take one task at a time per process: long sends don't hoard queued work.
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
# No task may run forever. The soft limit raises inside the task so it can
# record a failure; the hard limit kills the process.
CELERY_TASK_SOFT_TIME_LIMIT = config("CELERY_TASK_SOFT_TIME_LIMIT", default=300, cast=int)
CELERY_TASK_TIME_LIMIT = config("CELERY_TASK_TIME_LIMIT", default=360, cast=int)
CELERY_TASK_ANNOTATIONS = {
    # A Diamond batch paces ~1s per guest plus delivery confirmation, so it gets
    # far longer limits. And it is at-most-once (acks_late off): re-running a
    # half-finished batch after a crash would text guests a second time.
    "guests.send_diamond_invites": {
        "acks_late": False,
        "soft_time_limit": 3300,
        "time_limit": 3400,
    },
}
# Redis redelivers unacknowledged tasks after this; must exceed the longest task.
CELERY_BROKER_TRANSPORT_OPTIONS = {"visibility_timeout": 3600 + 600}
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_RESULT_EXPIRES = 60 * 60 * 24
CELERY_WORKER_CONCURRENCY = config("CELERY_WORKER_CONCURRENCY", default=None, cast=lambda v: int(v) if v else None)

CELERY_BEAT_SCHEDULE = {
    # Hourly rather than daily: a lapsed plan is also expired on the user's next
    # request (accounts.authentication), this catches accounts that are idle.
    "expire-nexainvite-subscriptions-daily": {
        "task": "subscriptions.tasks.expire_subscriptions",
        "schedule": 60 * 60,
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

# Optional: comma-separated email addresses that receive an email for every
# unhandled server error (500). Leave empty to disable.
ADMINS = config("ADMINS", default="", cast=Csv())
SERVER_EMAIL = config("SERVER_EMAIL", default=DEFAULT_FROM_EMAIL)

# ---------------------------------------------------------------------------
# Logging. JSON lines in production (for log collectors), readable text in
# development. A redaction filter scrubs passwords, tokens and secrets.
# ---------------------------------------------------------------------------
LOG_LEVEL = config("LOG_LEVEL", default="INFO").upper()
LOG_FORMAT = config("LOG_FORMAT", default="json" if IS_PRODUCTION else "text")
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "redact": {"()": "config.logging.RedactSecretsFilter"},
        "require_debug_false": {"()": "django.utils.log.RequireDebugFalse"},
    },
    "formatters": {
        "json": {"()": "config.logging.JsonFormatter"},
        "text": {"format": "%(asctime)s %(levelname)s %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if LOG_FORMAT == "json" else "text",
            "filters": ["redact"],
        },
        "mail_admins": {
            "class": "django.utils.log.AdminEmailHandler",
            "level": "ERROR",
            "filters": ["require_debug_false", "redact"],
            "include_html": False,
        },
    },
    "root": {"handlers": ["console"], "level": LOG_LEVEL},
    "loggers": {
        "django": {"handlers": ["console"], "level": LOG_LEVEL, "propagate": False},
        "django.request": {
            "handlers": ["console", "mail_admins"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.security": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "celery": {"handlers": ["console"], "level": LOG_LEVEL, "propagate": False},
    },
}

# Optional error monitoring. Set SENTRY_DSN and `pip install sentry-sdk` to enable;
# personal data (IPs, cookies, request bodies) is never sent.
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN:
    from config.monitoring import init_sentry

    init_sentry(SENTRY_DSN, environment=DJANGO_ENV)
