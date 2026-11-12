# NexaInvite Development Progress

## Current increment: Phase 1 — Backend quality baseline

### Completed

- Added API tests for account registration, password mismatch, profile authentication, and protection against self-service subscription-tier changes.
- Added public-template listing, filtering, and detail tests.
- Added invitation ownership, publishing, public visibility, and soft-delete tests.
- Added guest ownership and Gold-tier export-permission tests.
- Added public RSVP, unpublished-invitation, guest/invitation association, and guest-count boundary tests.
- Fixed RSVP submission so a guest ID belonging to a different invitation returns a validation error (HTTP 400) rather than an unhandled database lookup exception.
- Added an upper bound to RSVP guest_count so it cannot overflow the model's PositiveSmallIntegerField.
- Deferred ReportLab imports until a PDF endpoint is called, so unrelated API endpoints do not require PDF rendering dependencies merely to load URL configuration.
- Added a root `.gitignore` covering local secrets, virtual environments, databases, media, and frontend build artifacts.

### Validation performed

- Django system checks: passed.
- Migration consistency check (`makemigrations --check --dry-run`): passed; no model migration is required for this increment.
- Backend tests: 20 passed.

The test runner in the analysis environment used the project's bundled Django/DRF packages with Python 3.13 and a temporary Pillow import stub because the archive's Pillow binary was compiled for Python 3.12. This stub was only for the ImageField system check; PDF generation and image processing were not exercised. Run the normal test command in the project's supported virtual environment to validate those integrations too:

```bash
cd backend
source venv/bin/activate
python manage.py test
```

## Next development increments

1. Complete test coverage for CSV import edge cases, invitation duplication, PDF endpoints, delivery tasks, and lead throttling.
2. Add frontend component and end-to-end tests.
3. Complete security hardening (token revocation/logout semantics, throttling for public RSVP endpoints, upload validation, production settings).
4. Implement payment and subscription records, then gateway integration and webhook processing.
5. Implement media storage, notifications, QR generation, CSV exports, and admin reporting.

## Important release note

Do not deploy the current code as production-ready based solely on this increment. Payment lifecycle, full frontend/E2E coverage, operational monitoring, and production security configuration remain outstanding. Keep `.env` and `.env.local` files out of version control and rotate any credentials that may have been shared outside the trusted development environment.

## Phase 3 – Media Management and Catalogue Completion

- Added authenticated, owner-scoped media upload/list/delete APIs.
- Added server-side image format, size and dimension validation.
- Added user-specific media paths and image metadata.
- Integrated image upload/removal and live preview into the invitation editor.
- Added idempotent starter invitation-card and NexaForge product catalogue commands.
- Added detailed product data and generic product detail pages while preserving the existing NexaInvite detail page.
- Added product and media API tests.
- Apply with `python manage.py migrate` then `python manage.py seed_catalog`.

Validation note: Python compileall passed and TypeScript/TSX syntax transpilation passed for all 42 frontend source files. Django runtime tests/migrations and the full Next.js build could not be run in this offline build environment because dependencies were unavailable; run the documented commands locally before merging/deploying.

## Phase 4 – Notification Management

- Added the `notifications` Django app with user-scoped in-app notifications and email preferences.
- Added email delivery Celery task with retry and delivery status tracking.
- Added list, unread count, mark-read, mark-all-read, and preference APIs.
- Connected notifications to registration, invitation publishing, RSVP updates, guest send completion, payment success/failure, and subscription expiry.
- Added daily three-day subscription expiry reminders to Celery Beat.
- Added the dashboard notifications page and sidebar entry.
- Added SMTP environment examples; local development defaults to console email.
- Added notification API tests. Runtime test execution is pending in this build environment because Django dependencies are not installed here.
- Preserved Phase 3 invitation card catalogue, product catalogue, product detail routes, subscription/payment code, media manager, and existing documentation.

### Catalogue preservation audit

- Audited the original SQLite catalogue: 8 original invitation cards and 5 original product descriptions.
- Added a data migration to restore the eight original cards, retaining the Phase 3 anniversary card under a separate name.
- Added `legacy_tagline` and `legacy_description` to products and a data migration to preserve the five original product descriptions.
- Updated the product detail page to show retained original copy when it differs from the current product details.
- Updated the canonical seed command to include original and extended cards plus all product details; existing template rows are not overwritten.
- Expected post-seed inventory: 20 invitation cards and 10 product records.

## Phase 5 – Admin Portal

- Added a staff-only admin API namespace and Next.js administration page.
- Added platform KPIs and recent user/activity summaries.
- Added user management with guarded account activation, verification, role and staff controls.
- Added invitation status management without deleting invitation records.
- Added template/product management APIs; referenced templates and products are deactivated rather than removed through the admin portal.
- Added read-only payment/subscription monitoring, leads and notification monitoring.
- Added append-only administrative activity log and API tests.
- Exposed the `is_staff` flag in the authenticated current-user serializer so the sidebar can show the staff-only entry; backend permissions remain authoritative.
- No catalogue or customer-data migration/deletion was introduced.
- Validation: Python compile/AST parse passed. Django runtime tests and Next.js build require local dependencies and remain to be run.

## Phase 6 – Analytics and Reporting

- Added staff-only `/api/v1/admin/analytics/` endpoint with 30-day and 90-day daily series, plus 12-month monthly series for registrations, invitations, RSVPs and captured revenue.
- Added platform totals for new users/invitations/RSVPs, captured revenue, active subscriptions and lifetime paying-customer conversion rate.
- Added breakdowns for invitation statuses, RSVP responses, active subscription plans, template categories and product portfolio status.
- Added staff-only CSV report export for users, invitations, guests, RSVPs, payments, subscriptions and leads.
- CSV exports accept an optional paired start/end date range (maximum 366 days), use allow-listed datasets, and neutralize spreadsheet formula-leading values.
- Added Admin Portal Analytics and Reports tabs with selectable periods, compact charts, breakdowns, conversion metric and CSV download UI.
- Existing Phase 5 admin tabs, invitation-card catalogue, NexaForge product catalogue, product descriptions and customer data remain unchanged. No database schema migration is required.
- Validation: Python compileall and AST parsing passed; modified admin TSX transpilation passed. Django runtime tests and full Next.js type/build checks require the project's local dependencies and must be run locally.

### Phase 6 measurement note

Product reporting currently shows the operational portfolio mix (status and active/inactive counts). Product page-view and CTA conversion telemetry is intentionally not claimed or fabricated; adding visitor-level tracking should follow a privacy/consent decision and a separate event instrumentation increment.
