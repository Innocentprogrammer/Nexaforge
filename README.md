# NexaForge / NexaInvite

**NexaForge Technologies** is the parent company; **NexaInvite** (an AI-assisted digital
invitation and event-management platform, wedding-first) is its first live SaaS product. This
repo now implements both: the NexaForge corporate marketing site (Home, Products, Services,
Pricing, Careers, About, Contact) and the NexaInvite product app, sharing one Next.js frontend,
one design system, and one login — see `Documentation/Website Blueprint.MD` and
`Documentation/Brand Guidelines.MD` for the source spec.

> "Design Beautiful Invitations. Share Instantly. Celebrate Together." — NexaInvite
> "Forging the Future of Digital Businesses." — NexaForge

## What's implemented

**Corporate marketing site** (`/`, `/products`, `/products/nexainvite`, `/services`, `/pricing`,
`/careers`, `/about`, `/contact`) — shared `SiteHeader`/`SiteFooter`/`MarketingShell`, a `Product`
API (`/products/`, seeded: NexaInvite Operational + NexaCRM/NexaERP/NexaFlow/NexaAI Coming Soon)
driving the Home and Products pages, and a `Lead` API (`/leads/`) backing the Contact form and
footer newsletter signup.

**NexaInvite product app** (MVP vertical slice):
- **Auth**: register/login/refresh via JWT (`accounts` app)
- **Template Gallery**: seeded starter templates, browsable without login
- **Invitation Editor**: create an invitation from a template, edit event details + design fields
  with a live preview, autosave (30s) + manual save, publish
- **Guest List**: add/remove guests per invitation, CSV import (Gold/Diamond)
- **RSVP**: public no-login RSVP form on the published invitation page, owner-side RSVP summary
  dashboard (accepted/declined/maybe/pending counts)
- **Public invitation page**: `/i/<slug>` — shareable, no auth required, deliberately has no
  NexaForge/NexaInvite chrome (a guest views the host's invitation, not the SaaS vendor's site)
- **PDF export**: `GET /invitations/<id>/pdf/` renders the invitation server-side with
  reportlab, off the same `invitation_json` the live preview and public page use. Gold/Diamond
  hosts also get `GET /guests/<id>/pdf/`, the same renderer with a personalised cover page.

### Subscription tiers

Tier lives on the **host account** (`User.subscription_tier`), not on individual guests, and is
cumulative — each tier includes everything below it:

| Tier | Gets |
| --- | --- |
| `NORMAL` | Invitation building, the single public `/i/<slug>` link, generic PDF download |
| `GOLD` | + CSV guest import, per-guest `/invite/<token>` links (with a "Hi {name}" greeting), per-guest personalised PDFs, invite-links CSV export |
| `DIAMOND` | + WhatsApp/SMS delivery. **A Diamond CSV import sends immediately, with no confirmation step.** |

There is no billing, so tier is not self-service — the API exposes `subscription_tier`
read-only. Move an account with `python manage.py set_subscription_tier <email> GOLD`
(`--list` shows every account's tier) or via the Django admin.

Diamond imports pre-filter phone numbers to **10-digit Indian national numbers** (after
stripping `+91`/`0091`/`0`/spaces/dashes) before normalisation or Twilio see them, and
de-duplicate by normalised number within the batch. Rows excluded either way are listed in the
import summary rather than silently dropped.

Still pending (see `Documentation/Development Roadmap.MD`): CSV guest export, a custom admin panel UI,
real QR-code image generation (a placeholder URL is stored instead), and Docs/Blog/Case Studies pages.
Payments/subscriptions, media/image uploads, the invitation/product catalogues, and notifications are now included in the source tree.

## Stack

- **Backend**: Django 6 + Django REST Framework + SimpleJWT, SQLite for local dev
  (Postgres via `DB_ENGINE=postgres`, see `docker-compose.yml`)
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS v4, brand colors/fonts from
  `Documentation/Brand Guidelines.MD` (Poppins + Inter)

## Running locally (without Docker)

Backend:
```bash
cd backend
source venv/bin/activate   # venv already created; if missing: python3 -m venv venv
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_catalog
python manage.py seed_subscription_plans
python manage.py runserver 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

The frontend reads `NEXT_PUBLIC_API_BASE_URL` from `frontend/.env.local`
(defaults to `http://localhost:8000/api/v1`).

## Running with Docker (Postgres + Redis)

```bash
docker compose up --build
```

## Project memory

See `MEMORY.md` for what's been built, key decisions, and where to pick up next — read that
before `Documentation/` on future sessions to avoid re-reading the full doc set.

## Phase 3/4 setup: preserve and load the full catalogue

**Back up the existing database before upgrading. Do not delete or replace your current `db.sqlite3` or production database.** For SQLite:

```bash
cp backend/db.sqlite3 "backend/db.sqlite3.backup.$(date +%Y%m%d-%H%M%S)"
```

For PostgreSQL, take a `pg_dump` backup before running migrations. Then, against the existing database, run:

```bash
cd backend
python manage.py migrate
python manage.py seed_catalog
python manage.py seed_subscription_plans
```

The migration restores the original eight invitation cards, retains the newer anniversary design as a separate card, and preserves the original five product taglines/descriptions in dedicated legacy fields. The seed command then adds the extended designs and all ten NexaForge products without deleting catalogue rows. It is safe to rerun.

The invitation editor also supports authenticated image uploads through `/api/v1/media/`.
See `Documentation/PHASE-3-MEDIA-CATALOG.md` for API and storage details. Phase 4 adds authenticated in-app notifications and configurable email delivery; see `Documentation/PHASE-4-NOTIFICATIONS.md`.

## Phase 4 – Notifications

See `Documentation/PHASE-4-NOTIFICATIONS.md` for notification APIs, email configuration, Celery worker/Beat setup, and validation steps. Local email defaults to the console backend; configure SMTP credentials only in a local ignored `.env` or deployment secrets.
