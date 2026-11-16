# NexaInvite backend: Django API (gunicorn), Celery worker and Celery beat all
# run from this one image; docker-compose.yml picks the command.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Unprivileged runtime user. psycopg2-binary ships its own libpq, so no
# compiler or -dev packages are needed.
RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY --chown=app:app . .

# Static files are built into the image with the production storage (hashed,
# compressed names WhiteNoise serves). The throwaway values below exist only so
# production settings load during this one command; none of them ship.
RUN DJANGO_ENV=production \
    SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(64))')" \
    ALLOWED_HOSTS=build.invalid \
    CACHE_URL=redis://build.invalid:6379/1 \
    CORS_ALLOWED_ORIGINS=https://build.invalid \
    DATABASE_URL=postgres://build:build@build.invalid:5432/build \
    python manage.py collectstatic --noinput \
    # The media volume mounts here; creating it owned by `app` makes a new
    # named volume start out writable by the app user.
    && mkdir -p /app/media \
    && chown -R app:app /app/media /app/staticfiles

# Starts as root only so the entrypoint can make a root-owned disk mount
# writable; every process then runs as `app` (see docker-entrypoint.sh).
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Render sets PORT (default 10000); docker-compose uses 8000.
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os,urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:%s/api/v1/health/' % os.environ.get('PORT', '8000'), timeout=4).status == 200 else 1)"

CMD ["sh", "-c", "exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${GUNICORN_WORKERS:-3} --timeout ${GUNICORN_TIMEOUT:-60} --forwarded-allow-ips='*' --access-logfile - --error-logfile -"]
