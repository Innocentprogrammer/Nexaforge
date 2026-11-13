# NexaInvite Backend

Django 6 + Django REST Framework API for the NexaForge corporate site and the NexaInvite
product (invitations, guests, RSVPs, subscriptions, notifications, admin portal).

- API base: `http://localhost:8000/api/v1/`
- Django admin: `http://localhost:8000/admin/`
- Auth: JWT via SimpleJWT (`Authorization: Bearer <access>`), login by email
- Response envelope: `{success, message, data, meta}` (SimpleJWT login/refresh return a flat body)

For product-level docs see the root [`README.md`](../README.md), [`MEMORY.md`](../MEMORY.md)
(decisions and history) and `../Documentation/`.

## Quick start

```bash
cd backend
python3 -m venv venv            # skip if venv/ already exists
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then edit .env (see Configuration)
python manage.py migrate
python manage.py seed_catalog              # invitation cards + NexaForge products
python manage.py seed_subscription_plans   # Normal / Gold / Diamond plans
python manage.py createsuperuser           # optional, for /admin/
python manage.py runserver 8000
```

The frontend (`../frontend`) expects the API at `http://localhost:8000/api/v1`.

**After editing `.env`, restart `runserver`.** Its autoreload watches `.py` files only, so a
running server keeps the old values.

### Background tasks (Celery)

By default `CELERY_TASK_ALWAYS_EAGER=True`: tasks (emails, WhatsApp/SMS sends) run inline
inside the request, and no Redis or worker is needed. To run them asynchronously:

```bash
# .env: CELERY_TASK_ALWAYS_EAGER=False, CELERY_BROKER_URL=redis://localhost:6379/0
celery -A config worker -l info
celery -A config beat -l info     # daily subscription expiry job
```

`docker compose up --build` from the repo root starts Postgres, Redis, the API, a worker and beat.

## Apps

| App | Responsibility |
| --- | --- |
| `config` | Settings, root URLs, Celery app |
| `accounts` | Custom `User` (email login, `subscription_tier`), register/login/logout, forgot/reset password, `/users/me/` |
| `templates_app` | Invitation template catalogue |
| `invitations` | Invitations CRUD, publish/duplicate, public `/i/<slug>` payload, PDF export |
| `guests` | Guest list, CSV import, per-guest invite links and PDFs, Diamond WhatsApp/SMS + email sends |
| `rsvp` | Public RSVP submission and owner RSVP summary |
| `subscriptions` | Plans, Razorpay orders/verification/webhook, subscription status, payment history |
| `notifications` | In-app notifications, email preferences, notification email task |
| `media_manager` | Authenticated image uploads for the editor |
| `products` | NexaForge product catalogue |
| `leads` | Contact form / newsletter leads (throttled) |
| `admin_portal` | Staff-only dashboard, analytics, CSV reports, user/content management, activity log |

## Subscription tiers

Tier is stored on the host account (`User.subscription_tier`) and is cumulative:

| Tier | Adds |
| --- | --- |
| `NORMAL` | Invitations, the public `/i/<slug>` link, generic PDF |
| `GOLD` | CSV guest import, per-guest `/invite/<token>` links, per-guest PDFs, invite-links CSV export |
| `DIAMOND` | Invite delivery by WhatsApp/SMS **and email** — to all guests, or one guest at a time. A Diamond CSV import sends immediately. |

Change a tier for testing: `python manage.py set_subscription_tier <email> DIAMOND`
(`--list` shows every account's tier).

### Diamond invite delivery

`guests.tasks.send_diamond_invites` handles each guest in turn:

1. If the guest has an email address, it emails them their personal link
   (templates in `guests/templates/guests/emails/`).
2. WhatsApp is tried first. If Twilio reports the number is unreachable on WhatsApp, it falls
   back to SMS.
3. A guest counts as sent if either channel got through. Results are stored in `InviteSendLog`:
   `channel`, `status` and `provider_error` for WhatsApp/SMS, plus `email_status` and
   `email_error`.

`INVITE_SEND_BACKEND=console` (the default) only logs WhatsApp/SMS messages, so no Twilio
account is needed. Run `python manage.py check_twilio` to validate a real Twilio setup.

## Main API endpoints

All paths are under `/api/v1/`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST auth/register/`, `auth/login/`, `auth/refresh/`, `auth/logout/`, `auth/password/forgot/`, `auth/password/reset/validate/`, `auth/password/reset/`; `GET/PATCH users/me/` |
| Templates | `GET templates/`, `templates/{id}/` |
| Invitations | `GET/POST invitations/`, `GET/PATCH/DELETE invitations/{id}/`, `POST invitations/{id}/publish/`, `invitations/{id}/duplicate/`, `GET invitations/{id}/pdf/`, `GET public/invitations/{slug}/` |
| Guests | `GET/POST invitations/{id}/guests/`, `PATCH/DELETE guests/{id}/`, `GET guests/{id}/pdf/`, `POST guests/import/`, `POST invitations/{id}/guests/export-links/`, `GET public/invite/{token}/` |
| Diamond sends | `POST invitations/{id}/guests/send-diamond-invites/` (optional body `{"guest_ids": ["<uuid>"]}` for specific guests), `GET invitations/{id}/guests/send-status/` |
| RSVP | `POST rsvp/` (public), `GET invitations/{id}/rsvp/` |
| Billing | `GET subscription-plans/`, `POST payments/create-order/`, `POST payments/verify/`, `POST payments/webhook/razorpay/`, `GET subscriptions/me/`, `GET payments/history/` |
| Notifications | `GET notifications/`, `GET notifications/unread-count/`, `POST notifications/read-all/`, `PATCH notifications/{id}/read/`, `GET/PATCH notifications/preferences/` |
| Media | `media/` (authenticated uploads) |
| Site | `GET products/`, `GET products/{slug}/`, `POST leads/` |
| Admin (staff) | `admin/dashboard/`, `admin/analytics/`, `admin/reports/export/`, `admin/users/`, `admin/payments/`, `admin/subscriptions/`, `admin/leads/`, `admin/notifications/`, `admin/activity/`, plus `admin/invitations/`, `admin/templates/`, `admin/products/` |

## Configuration (`.env`)

Values are read with `python-decouple`. `.env.example` lists them with comments. Keep real
credentials only in `.env`, which must not be committed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` | dev values | Core Django settings. Set a real key and `DEBUG=False` in production. |
| `DB_ENGINE` | `sqlite` | `postgres` to use `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` |
| `FRONTEND_URL` | `http://localhost:3000` | Base for links in emails and per-guest invite URLs |
| `GUEST_DEFAULT_COUNTRY_CODE` | `+91` | Applied to guest numbers entered without a country code |
| `PASSWORD_RESET_TIMEOUT` | `3600` | Reset-link lifetime in seconds |
| `CELERY_TASK_ALWAYS_EAGER` | `True` | Run tasks inline. Set `False` to use `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND`. |
| `INVITE_SEND_BACKEND` | `console` | `twilio` for real WhatsApp/SMS |
| `NEXAINVITE_TWILIO_*` | empty | `ACCOUNT_SID`, `AUTH_TOKEN`, `WHATSAPP_FROM` (with the `whatsapp:` prefix), `SMS_FROM`, `TEMPLATE_SID` (`HX…`) |
| `INVITE_SEND_DELAY_SECONDS`, `INVITE_SEND_CONFIRM_ATTEMPTS`, `INVITE_SEND_CONFIRM_INTERVAL`, `INVITE_SEND_DUPLICATE_SMS` | `1.0`, `6`, `2.0`, `False` | Pacing and delivery-confirmation tuning |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | empty | Razorpay test-mode credentials |
| `EMAIL_BACKEND` | console | `django.core.mail.backends.smtp.EmailBackend` for real email |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_USE_SSL`, `DEFAULT_FROM_EMAIL` | — | SMTP settings. Used by notifications, password reset and invite emails. |

**Gmail SMTP:** use `smtp.gmail.com`, port `587`, TLS on, and a 16-letter App Password
entered without spaces or hyphens. A badly formatted password makes Gmail close the connection,
which shows up as `SMTPServerDisconnected` rather than an authentication error.

## Management commands

| Command | Does |
| --- | --- |
| `seed_catalog` | Loads invitation cards and NexaForge products without removing existing rows (safe to rerun) |
| `seed_templates`, `seed_invitation_catalog` | The two halves of the card catalogue |
| `seed_product_catalog` (`seed_products` alias) | NexaForge product suite |
| `seed_subscription_plans` | Creates or updates the Normal / Gold / Diamond plans |
| `set_subscription_tier <email> <TIER>` / `--list` | Changes or lists account tiers |
| `check_twilio [--to +91…]` | Validates the Twilio config; `--to` sends one real message, which costs money |

## Tests

```bash
python manage.py test              # whole suite
python manage.py test guests       # one app
```

Tests use the locmem email backend and the console invite sender, so they make no network calls.

## Data safety

Back up `db.sqlite3` (or `pg_dump` for Postgres) before running migrations against a database
with real data. Seed commands add and update rows; they never delete them.
