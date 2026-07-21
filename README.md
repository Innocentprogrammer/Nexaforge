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
- **Guest List**: add/remove guests per invitation
- **RSVP**: public no-login RSVP form on the published invitation page, owner-side RSVP summary
  dashboard (accepted/declined/maybe/pending counts)
- **Public invitation page**: `/i/<slug>` — shareable, no auth required, deliberately has no
  NexaForge/NexaInvite chrome (a guest views the host's invitation, not the SaaS vendor's site)

Not yet implemented (see `Documentation/Development Roadmap.MD` for the full MVP scope):
payments/subscriptions, notifications, media/image uploads, CSV guest export, admin panel UI,
QR code image generation (a placeholder URL is stored instead), Docs/Blog/Case Studies pages.

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
python manage.py seed_templates
python manage.py seed_products
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
