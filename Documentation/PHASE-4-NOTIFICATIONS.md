# Phase 4 – Notification Management

## Scope delivered

Phase 4 is additive to Phase 3. Existing invitation templates, seeded invitation designs, product catalogue, product detail routes, payment/subscription APIs, media APIs, and existing dashboard routes remain in place. The release also includes `templates_app.0002_restore_original_invitation_cards` and `products.0003_legacy_product_copy`: these restore the original eight invitation designs, retain the newer anniversary design separately, and keep the original five product descriptions in dedicated legacy fields. After seeding, the expected catalogue is 20 invitation cards and 10 NexaForge products.

### Backend

- New `notifications` Django application.
- User-scoped in-app notification records with category, action URL, metadata, read state, and email delivery state.
- Per-user email preferences for account, invitation, RSVP, and billing categories.
- Celery task for asynchronous email delivery, with retry and persisted delivery errors.
- Authenticated APIs:
  - `GET /api/v1/notifications/`
  - `GET /api/v1/notifications/unread-count/`
  - `POST /api/v1/notifications/read-all/`
  - `PATCH /api/v1/notifications/{uuid}/read/`
  - `GET /api/v1/notifications/preferences/`
  - `PATCH /api/v1/notifications/preferences/`
- Event hooks for welcome, invitation published, RSVP received/changed, guest invitation delivery report, payment success/failure, subscription expiry, and a three-day expiry reminder.
- Daily Celery Beat schedule for expiry reminders. Existing subscription expiry schedule is retained.
- Django Admin management for notifications and preferences.

### Frontend

- New `/dashboard/notifications` page.
- Recent activity list, unread badge, mark-one-read, mark-all-read.
- Email preference controls.
- Sidebar navigation entry added without removing existing navigation.

## Catalogue preservation

Before applying this release to a database that contains real users or invitations, take a normal database backup. The migrations do not delete invitation, guest, RSVP, payment, or product rows. The template migration restores the original card records and preserves the Phase 3 anniversary variant under a distinct name. The product migration copies the original five product taglines/descriptions into `legacy_tagline` and `legacy_description`; the product detail page displays that copy when it differs from the current description. The seed command does not delete records.

## Configuration

Local development defaults to Django's console email backend. This prints emails in the backend terminal and does not send real email. Keep this setting until real SMTP credentials have been configured.

For SMTP delivery, configure in `backend/.env` (or deployment environment):

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-smtp-user
EMAIL_HOST_PASSWORD=your-smtp-password
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=NexaInvite <no-reply@your-domain.com>
```

Do not commit SMTP credentials. Use a provider's application password/API credential, not a personal mailbox password.

## Run

```bash
cd backend
python manage.py migrate
python manage.py test notifications
```

For local synchronous task execution, keep `CELERY_TASK_ALWAYS_EAGER=True` (the default). For asynchronous execution, set it to `False` and run:

```bash
celery -A config worker -l info
celery -A config beat -l info
```

Docker Compose already includes worker and beat services; the email environment variables are passed to the backend and worker.

## Validation still required before production

- Configure real SMTP credentials and send test emails to controlled mailboxes.
- Configure production Celery worker and Beat with persistent Redis.
- Confirm provider sending limits, SPF, DKIM, and DMARC for the sending domain.
- Run the full backend test suite and full Next.js production build in the deployment environment.
- Review privacy/retention policy for notification message and metadata.

## Current scope boundaries

- Email is plain text in this increment; branded HTML templates can be added after the product's final email design is approved.
- The email status records acceptance by the configured Django email backend. It is not proof of inbox delivery; provider webhooks/bounce processing are a later hardening task.
- Browser push notifications and SMS alerts for account events are not included. Existing guest WhatsApp/SMS invitation delivery remains unchanged.
- The dashboard loads the most recent notification page; the API supports `page` and `page_size` for history pagination.
- Add retention/cleanup policy and production SPF/DKIM/DMARC checks before public launch.
