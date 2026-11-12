# NexaInvite Phase 6 — Analytics & Reporting

Phase 6 extends the Phase 5 admin portal. It does not replace or reseed invitation cards, product records, customer data, payments, subscriptions, or existing pages.

## Admin UI

Open `/dashboard/admin` and select:

- **Analytics** — choose 30 days, 90 days, or 12 months. Shorter periods are grouped daily; 12 months is grouped monthly.
- **Reports** — export Users, Invitations, Guests, RSVPs, Payments, Subscriptions, or Leads as CSV. A date filter is optional; when used, both dates are required and the range cannot exceed 366 days.

## API endpoints

All endpoints require an authenticated Django staff account (`is_staff=True`).

### Analytics

`GET /api/v1/admin/analytics/?days=30`

Allowed `days`: `30`, `90`, `365`.

Returns time series for registrations, invitations, RSVP submissions and captured payment revenue, plus totals and breakdowns for invitation status, RSVP response, active plans, template categories and product portfolio status. Currency amounts in the API are in paise.

The customer conversion rate is a lifetime measure: distinct customers with at least one captured payment divided by all registered users. It is not a cohort conversion rate.

### CSV reports

`GET /api/v1/admin/reports/export/?report=payments`

Allowed reports: `users`, `invitations`, `guests`, `rsvps`, `payments`, `subscriptions`, `leads`.

Optional paired date parameters:

`&start_date=2026-01-01&end_date=2026-12-31`

CSV output includes a UTF-8 BOM for spreadsheet compatibility and prefixes formula-leading user-controlled values to reduce spreadsheet formula injection risk. Payment amounts are exported in minor currency units (paise).

## Local validation

From `backend/` with the project virtual environment activated:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test admin_portal
python manage.py test
```

From `frontend/`:

```bash
npm ci
npm run build
```

## Measurement limitation

Product breakdown currently reports the catalogue portfolio (status and active/inactive counts). Product page-view and CTA conversion tracking are not part of this increment; no visitor telemetry is fabricated. Instrumenting visitor events should be designed with a privacy/consent policy before collection.
