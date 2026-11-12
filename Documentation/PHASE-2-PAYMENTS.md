# Phase 2 – Payments and Subscription Lifecycle

## What was added

- `subscriptions` Django app with plans, subscriptions, payment ledger, and webhook event ledger.
- Razorpay order creation through the server-side REST API.
- Checkout payment signature verification.
- Webhook signature verification and idempotent event processing.
- Activation of the existing `accounts.User.subscription_tier` only after verified payment.
- Current-subscription and payment-history APIs.
- Daily Celery task to expire paid subscriptions and restore the Normal tier.
- Pricing page now loads plan data from the API and launches Razorpay Checkout.

## Configuration

For local backend development, copy `backend/.env.example` to `backend/.env`. For Docker Compose, copy the root `.env.example` to `.env`. Add Razorpay **test-mode** credentials in the file used by your run mode:

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Never put `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` in a `NEXT_PUBLIC_*` variable.

## First-time setup

```bash
cd backend
python manage.py migrate
python manage.py seed_subscription_plans
```

For local development, plan prices are initialized as configurable values:

- Normal: ₹0
- Gold: ₹299 / 30 days
- Diamond: ₹799 / 30 days

Administrators can edit prices, features, duration, and active state in Django Admin. These are initial launch values and should be commercially approved before live payments are enabled.

## API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/v1/subscription-plans/` | Public | List active plans |
| POST | `/api/v1/payments/create-order/` | Authenticated | Create Razorpay order |
| POST | `/api/v1/payments/verify/` | Authenticated | Verify checkout signature and activate |
| POST | `/api/v1/payments/webhook/razorpay/` | Razorpay webhook | Verify and process gateway events |
| GET | `/api/v1/subscriptions/me/` | Authenticated | Current active subscription |
| GET | `/api/v1/payments/history/` | Authenticated | Current user's payment history |

## Razorpay webhook setup

Configure this webhook URL in the Razorpay Dashboard:

`https://YOUR_API_DOMAIN/api/v1/payments/webhook/razorpay/`

Subscribe to `payment.captured` and `payment.failed`. Use the same webhook secret configured in `RAZORPAY_WEBHOOK_SECRET`.

## Local development

The frontend loads Razorpay Checkout from Razorpay's hosted checkout script. Backend checkout endpoints return a configuration error until test credentials are supplied. The backend never trusts a frontend success flag; it verifies the HMAC signature server-side.

## Important launch checks

- Replace the illustrative plan prices after commercial approval.
- Configure HTTPS before registering a live webhook.
- Test successful, failed, cancelled, duplicate-webhook, and delayed-webhook flows in Razorpay test mode.
- Configure and run both Celery worker and Celery Beat in deployment for scheduled expiry.
- Define refund, cancellation, tax invoice, and customer support processes before enabling live payments.

## Validation performed for this development increment

- Backend test suite: **31 tests passed** (11 subscription/payment tests plus the existing backend tests).
- `makemigrations --check --dry-run`: no model/migration drift detected.
- `seed_subscription_plans`: successfully creates the three initial plan records; reruns preserve administrator-edited plan values.
- Python syntax compilation: passed.
- Modified TSX files: syntax transpilation passed.

The local validation container did not have the frontend's `node_modules`, so a full Next.js type-check/build was not available. The local Pillow binary was built for a different Python version; Django's Pillow system check was silenced only for the backend test run. The test suite does not exercise image/PDF rendering. No live Razorpay transaction was run because gateway credentials were not provided.
