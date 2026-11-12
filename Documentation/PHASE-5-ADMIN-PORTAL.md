# Phase 5 – Admin Portal

## Scope delivered

- Staff-only REST API under `/api/v1/admin/` (permission checks use Django `is_staff`; the editable customer-facing `role` field does not grant access).
- Overview metrics for users, invitations, guests, RSVPs, templates, products, subscriptions, revenue, leads and notification health.
- User search/list and controlled account actions (activate/deactivate, verification, role; staff grants/revocations require a superuser).
- Invitation monitoring and status changes. Invitations are retained; archive is a status change, not a hard delete.
- Invitation-template CRUD. A template referenced by existing invitations is deactivated instead of deleted.
- Product CRUD. Product deletion from the portal deactivates it to preserve catalogue history and routes.
- Read-only payment and subscription monitoring. Subscription entitlements continue to be set only by verified payment processing.
- Leads and notification monitoring.
- Append-only admin activity log with actor, target, action, timestamp and request IP where available.
- Next.js `/dashboard/admin` page, visible in the sidebar only to staff accounts.

## New API routes

- `GET /api/v1/admin/dashboard/`
- `GET /api/v1/admin/users/`
- `PATCH /api/v1/admin/users/{uuid}/`
- `GET /api/v1/admin/invitations/`, `GET /api/v1/admin/invitations/{uuid}/`, `PATCH /api/v1/admin/invitations/{uuid}/`
- `GET|POST /api/v1/admin/templates/`, `GET|PUT|PATCH|DELETE /api/v1/admin/templates/{uuid}/`
- `GET|POST /api/v1/admin/products/`, `GET|PUT|PATCH|DELETE /api/v1/admin/products/{uuid}/`
- `GET /api/v1/admin/payments/`
- `GET /api/v1/admin/subscriptions/`
- `GET /api/v1/admin/leads/`
- `GET /api/v1/admin/notifications/`
- `GET /api/v1/admin/activity/`

List endpoints are paginated (25 by default, maximum 100). `search` is supported on users, invitations, payments, templates and products. Payments and subscriptions are read-only in this phase. Product and template edits are available through the REST endpoints; the initial dashboard exposes safe activation controls and read-only table views.

## Run

```bash
cd backend
python manage.py migrate
python manage.py test admin_portal
python manage.py runserver
```

Create or use a staff account (`python manage.py createsuperuser` creates a Django superuser/staff account), sign in, and visit `/dashboard/admin`.

## Important preservation guarantees

- No existing invitation, guest, payment, subscription, notification, product or template rows are deleted by the migration.
- Template deletion through the portal becomes deactivation when an invitation references it.
- Product deletion through the portal is a soft deactivation.
- Customer subscription tiers cannot be edited through the user-management endpoint; verified payment processing remains authoritative.
- The Django admin site and all previous customer-facing routes remain in place.

## Verification notes

Python source was syntax-compiled and AST-parsed in the build environment. Django runtime tests and the Next.js production build could not be executed because Django/frontend dependencies were not installed in this offline environment. Run the commands above and `npm ci && npm run build` locally before deployment.
