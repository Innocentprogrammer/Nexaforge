#!/bin/sh
# Start command for Render's Free plan (render.free.yaml), which has no
# pre-deploy command and no Shell: set up the database, then start gunicorn.
set -e
python manage.py migrate --noinput
python manage.py seed_catalog
python manage.py seed_subscription_plans
# Uses DJANGO_SUPERUSER_EMAIL/USERNAME/PASSWORD; fails harmlessly once the account exists.
python manage.py createsuperuser --noinput || true
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-10000}" \
  --workers "${GUNICORN_WORKERS:-2}" --timeout 120 --forwarded-allow-ips='*' \
  --access-logfile - --error-logfile -
