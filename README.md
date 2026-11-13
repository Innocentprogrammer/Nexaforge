# NexaForge Technologies | NexaInvite

**Forging the Future of Digital Businesses.**

NexaForge Technologies is the parent company building modern digital products and SaaS solutions.

**NexaInvite** is its first live SaaS product — an AI-assisted, wedding-first digital invitation and event-management platform that enables users to design beautiful invitations, manage guests, collect RSVPs, share personalized invitations and manage events digitally.

> **NexaInvite:** Design Beautiful Invitations. Share Instantly. Celebrate Together.  
> **NexaForge:** Forging the Future of Digital Businesses.

This repository contains both the NexaForge corporate marketing website and the NexaInvite SaaS application. Both share a single Next.js frontend, design system and authentication experience.

For the complete product vision and design specifications, refer to:

- `Documentation/Website Blueprint.MD`
- `Documentation/Brand Guidelines.MD`
- `Documentation/Development Roadmap.MD`

---

# 1. Project Overview

NexaForge Technologies and NexaInvite are implemented as two connected experiences.

### NexaForge – Corporate Website

The corporate website introduces the parent company, its products, services, career opportunities and business vision.

Implemented pages:

- Home
- Products
- Services
- Pricing
- Careers
- About
- Contact

### NexaInvite – SaaS Application

NexaInvite provides digital invitation creation, customization, guest management, RSVP tracking, subscription management, notifications and analytics.

The application supports three subscription tiers:

- NORMAL
- GOLD
- DIAMOND

Each tier includes the capabilities of the tiers below it.

---

# 2. What's Implemented

## A. Corporate Marketing Website

Routes:

| Route | Description |
|---|---|
| `/` | Corporate homepage |
| `/products` | Product catalogue |
| `/products/nexainvite` | NexaInvite product page |
| `/services` | Company services |
| `/pricing` | Pricing information |
| `/careers` | Career opportunities |
| `/about` | Company information |
| `/contact` | Contact and lead generation |

Shared components:

- SiteHeader
- SiteFooter
- MarketingShell

### Product API

The Product API (`/products/`) supplies product information to the corporate homepage and Products page.

Seeded products include:

- NexaInvite – Operational
- NexaCRM – Coming Soon
- NexaERP – Coming Soon
- NexaFlow – Coming Soon
- NexaAI – Coming Soon

### Lead Management API

The Lead API (`/leads/`) supports:

- Contact form submissions
- Footer newsletter signups
- Lead information management
- Admin-side lead management

---

## B. NexaInvite – Core Features

### 1. Authentication & User Management

Implemented functionality:

- User registration
- User login
- JWT authentication
- Token refresh
- Protected dashboard access
- Logout
- Forgot password
- Password reset
- Secure, time-limited password reset tokens
- Single-use password reset tokens

### 2. Invitation Template Catalogue

- Browsable invitation gallery
- 20 existing invitation designs
- Invitation categories
- Invitation details
- Template selection
- Invitation preview

The original invitation catalogue and existing designs must be preserved during future development.

### 3. Invitation Editor

Users can:

- Create invitations from existing templates
- Edit event information
- Customize invitation design fields
- View live previews
- Save invitations manually
- Autosave changes every 30 seconds
- Publish invitations
- Generate shareable public invitation links

### 4. Guest Management

Implemented functionality:

- Add guests
- View guest lists
- Edit guest information
- Delete guests
- Add multiple guests
- Search guests
- CSV guest import
- Guest management per invitation

GOLD and DIAMOND subscribers have access to CSV guest import.

### 5. RSVP Management

Public invitation pages allow guests to respond without creating an account.

Implemented functionality:

- Accept invitations
- Decline invitations
- RSVP validation
- Guest count / number of attendees
- Owner-side RSVP dashboard
- Accepted, declined, maybe and pending response counts

### 6. Public Invitation Pages

Public invitation routes:

- `/i/<slug>`
- `/invite/<token>`

Features:

- Public invitation viewing
- Personalized guest invitation links
- Guest-specific greetings
- Public RSVP submission

Public invitation pages deliberately do not display NexaForge or NexaInvite marketing navigation. Guests should see the host's invitation rather than the SaaS vendor's website.

### 7. PDF Generation

Implemented PDF functionality:

- Generic invitation PDF downloads
- Personalized invitation PDFs for eligible subscription tiers
- Server-side PDF rendering using ReportLab
- Invitation rendering based on the same `invitation_json` used by the live preview and public invitation page

Backend endpoints:

- `GET /invitations/<id>/pdf/`
- `GET /guests/<id>/pdf/`

### 8. Media Management

- Authenticated image uploads
- Invitation media management
- Media API integration
- Image storage configuration

API base:

`/api/v1/media/`

Refer to `Documentation/PHASE-3-MEDIA-CATALOG.md` for additional details.

---

# 3. Subscription Plans & Payments

NexaInvite includes subscription and payment functionality.

Subscription tiers:

| Tier | Features |
|---|---|
| NORMAL | Invitation creation, public invitation link and generic PDF download |
| GOLD | NORMAL features + CSV guest import, personalized guest invitation links, personalized PDFs and invite-links CSV export |
| DIAMOND | GOLD features + WhatsApp/SMS delivery and personalized invitation email delivery |

### Payment and Subscription Management

Implemented functionality includes:

- Pricing and subscription plan display
- Subscription plan selection
- Razorpay payment integration
- Payment initiation
- Payment verification
- Successful and failed payment handling
- Subscription activation
- Subscription replacement
- Previous subscription expiry
- Payment history
- Transaction records
- Automatic subscription expiry
- Duplicate payment callback protection

Subscription tiers and access permissions are associated with the user's account rather than individual guests.

The backend must remain the authority for subscription status and feature access.

**Important:** Payment credentials, Razorpay secrets and webhook configuration must be supplied through environment variables or deployment secrets. Never commit payment credentials to Git.

---

# 4. Notifications & Email System

NexaInvite includes an in-app notification system and configurable email delivery.

### In-App Notifications

- Notification creation
- Notification listing
- Mark notifications as read
- Unread notification count
- Notification persistence
- Subscription expiry reminders

### Email Functionality

Implemented email workflows include:

- Test emails
- Forgot-password emails
- Password reset emails
- Invitation-related emails
- Payment notifications
- Subscription expiry reminders
- General notification emails

### Background Email Processing

Celery handles background email and notification tasks.

Email delivery uses Django's configurable email backend.

Local development can use the console email backend. SMTP or another supported provider can be configured for actual delivery.

Refer to:

`Documentation/PHASE-4-NOTIFICATIONS.md`

---

# 5. Admin Dashboard & Business Management

The admin dashboard provides centralized application and business management.

Implemented functionality:

- Admin dashboard
- User statistics
- Invitation statistics
- User management
- Product management
- Subscription management
- Payment management
- Notification management
- Leads management
- Activity Log

### Activity Log

Records relevant application and administrative activities for monitoring and auditing.

### Admin Access

Administrator-only functionality must be protected through backend authentication and authorization, not just frontend route restrictions.

---

# 6. Analytics & Reporting

NexaInvite includes an analytics and reporting dashboard.

Implemented functionality:

- Total user statistics
- Total invitation statistics
- Revenue analytics
- Subscription analytics
- Date-based filtering
- Report generation
- Report downloads
- Dashboard refresh
- Empty-data handling

Analytics should use backend data as the source of truth.

---

# 7. Subscription-Based Invitation Delivery

### NORMAL

- Invitation creation
- One public invitation link
- Generic PDF download

### GOLD

Includes NORMAL features, plus:

- CSV guest import
- Per-guest invitation links
- Personalized greeting such as "Hi {name}"
- Personalized guest PDFs
- Invite-links CSV export

### DIAMOND

Includes GOLD features, plus:

- WhatsApp/SMS invitation delivery
- Send invitations to all guests
- Individual guest invitation delivery
- Personalized email invitation links
- Immediate invitation delivery after CSV import

### Phone Number Validation

DIAMOND guest imports include phone number filtering.

The import process:

- Accepts valid 10-digit Indian national phone numbers.
- Strips supported prefixes such as `+91`, `0091` and `0`.
- Removes spaces and dashes.
- Normalizes phone numbers before delivery.
- Deduplicates normalized phone numbers within a batch.
- Includes excluded rows in the import summary rather than silently dropping them.

---

# 8. Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| Next.js 16 | React application framework |
| React 19 | UI development |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| Next.js App Router | Application routing |

Brand typography:

- Poppins
- Inter

Brand colors and design specifications are documented in:

`Documentation/Brand Guidelines.MD`

## Backend

| Technology | Purpose |
|---|---|
| Django 6 | Backend framework |
| Django REST Framework | REST API |
| SimpleJWT | JWT authentication |
| Python | Backend programming |
| ReportLab | PDF generation |

## Database & Background Processing

| Technology | Purpose |
|---|---|
| SQLite | Local development database |
| PostgreSQL | Production database support |
| Redis | Message broker and caching support |
| Celery | Background task processing |
| Celery Beat | Scheduled task execution |

## External Integrations

- Razorpay – Payments
- SMTP / Email Provider – Email delivery
- Twilio – WhatsApp/SMS delivery

---

# 9. Project Structure

The repository contains the corporate website and NexaInvite application in one project.

```text
NexaForge/
│
├── backend/
│   ├── config/
│   ├── accounts/
│   ├── invitations/
│   ├── templates_app/
│   ├── guests/
│   ├── rsvp/
│   ├── products/
│   ├── leads/
│   ├── notifications/
│   ├── subscriptions/
│   ├── media/
│   ├── manage.py
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   └── README.md
│
├── Documentation/
│   ├── Website Blueprint.MD
│   ├── Brand Guidelines.MD
│   ├── Development Roadmap.MD
│   ├── PHASE-3-MEDIA-CATALOG.md
│   └── PHASE-4-NOTIFICATIONS.md
│
├── docker-compose.yml
├── MEMORY.md
└── README.md
```

*The structure above is representative. Refer to the actual source tree for the complete list of applications and files.*

---

# 10. Running Locally Without Docker

## Prerequisites

Install:

- Python 3.12 or a compatible project-supported version
- Node.js compatible with the frontend dependencies
- npm
- Redis
- Git

## Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create and activate the virtual environment if necessary:

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run database migrations:

```bash
python manage.py migrate
```

Seed the catalogue:

```bash
python manage.py seed_catalog
python manage.py seed_subscription_plans
```

Run Django:

```bash
python manage.py runserver 8000
```

Backend:

`http://localhost:8000`

## Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend:

`http://localhost:3000`

### Frontend API Configuration

The frontend reads:

`NEXT_PUBLIC_API_BASE_URL`

from `frontend/.env.local`.

Default development value:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

---

# 11. Redis and Celery Setup

Redis must be running before starting Celery.

Check Redis:

```bash
redis-cli ping
```

Expected output:

```text
PONG
```

### Start Celery Worker

From the backend directory:

```bash
source venv/bin/activate
celery -A config worker -l info
```

### Start Celery Beat

Open another terminal:

```bash
cd backend
source venv/bin/activate
celery -A config beat -l info
```

Keep the Worker and Beat processes running when testing background and scheduled tasks.

---

# 12. Running with Docker

The project supports a Docker-based setup with PostgreSQL and Redis.

Start the application:

```bash
docker compose up --build
```

Check running containers:

```bash
docker compose ps
```

Stop the application:

```bash
docker compose down
```

Do not use destructive volume-removal commands when existing database data must be preserved.

Refer to `docker-compose.yml` for the configured services and ports.

---

# 13. Environment Variables & Secrets

Environment variables should be stored in local ignored `.env` files or deployment secrets.

Never commit:

- Database passwords
- Django `SECRET_KEY`
- Razorpay API secrets
- Razorpay webhook secrets
- Gmail App Passwords
- SMTP passwords
- Twilio credentials
- Other private API keys

Use an `.env.example` file containing placeholder values for documentation.

Production settings should use secure configuration, including:

- `DEBUG=False`
- Correct `ALLOWED_HOSTS`
- Secure cookies
- HTTPS
- Appropriate CORS and CSRF configuration
- Production database credentials
- Secure secret management

---

# 14. Phase-Wise Development Progress

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Initial project setup, testing and cleanup | Completed |
| Phase 2 | Payment and subscription management | Implemented |
| Phase 3 | Media management and catalogue enhancements | Implemented |
| Phase 4 | Notifications and background processing | Implemented |
| Phase 5 | Admin dashboard and business management | Implemented |
| Phase 6 | Analytics and reporting | Implemented |
| Phase 7 | End-to-end functional testing | Completed according to reported test results |
| Phase 8 | Missing features, fixes and stabilization | Implemented according to reported test results |
| Phase 9 | Production-readiness audit and deployment | In progress |

---

# 15. Development Roadmap & Remaining Work

The following enhancements remain in the documented product roadmap:

| Feature | Status |
|---|---|
| CSV guest export | Pending |
| Real QR-code image generation | Pending |
| Docs pages | Pending |
| Blog pages | Pending |
| Case Studies pages | Pending |

The existing QR functionality stores a placeholder URL rather than generating a real QR-code image.

Additional production-readiness activities include:

- Security audit
- Database backup and recovery verification
- Production PostgreSQL configuration
- Production Redis configuration
- Production media storage
- Domain and SSL setup
- Production deployment
- Monitoring and error logging
- Final regression testing

Refer to:

`Documentation/Development Roadmap.MD`

---

# 16. Database & Catalogue Preservation

**Important: Never delete or replace an existing project database during upgrades.**

Before running migrations or seed commands, create a backup.

### SQLite Backup

From the project root:

```bash
cp backend/db.sqlite3 \
"backend/db.sqlite3.backup.$(date +%Y%m%d-%H%M%S)"
```

### PostgreSQL Backup

Use `pg_dump` to back up the existing database before applying migrations.

### Catalogue Setup

For an existing database, run:

```bash
cd backend

python manage.py migrate
python manage.py seed_catalog
python manage.py seed_subscription_plans
```

The catalogue seeding process is designed to add missing catalogue entries without deleting existing rows.

Preservation requirements:

- Preserve the original eight invitation cards.
- Retain the anniversary design as a separate card.
- Preserve original product taglines and descriptions in their dedicated legacy fields.
- Retain the extended invitation catalogue.
- Retain all ten NexaForge product records.
- Preserve existing invitation and product images.

Back up the database and media files before applying any upgrade.

Refer to:

- `Documentation/PHASE-3-MEDIA-CATALOG.md`
- `Documentation/PHASE-4-NOTIFICATIONS.md`

---

# 17. Project Memory & Documentation

For future development sessions, read the project documentation before modifying the application.

Recommended reading order:

1. `MEMORY.md`
2. `Documentation/Website Blueprint.MD`
3. `Documentation/Brand Guidelines.MD`
4. `Documentation/Development Roadmap.MD`
5. `backend/README.md`
6. Relevant phase-specific documentation

This helps maintain continuity and prevents unnecessary changes to previously implemented functionality.

---

# 18. Project Development Principles

All future development must follow these principles:

1. Extend the existing codebase instead of rebuilding it.
2. Preserve all existing invitation designs and product information.
3. Never delete existing customer records or payment history.
4. Use database migrations for schema changes.
5. Maintain backward compatibility with existing APIs wherever possible.
6. Keep frontend and backend validation consistent.
7. Protect sensitive configuration and credentials.
8. Test new functionality before marking it complete.
9. Perform regression testing after significant changes.
10. Maintain backups before major upgrades.

---

# NexaForge Technologies

**Forging the Future of Digital Businesses.**

### NexaInvite

**Design Beautiful Invitations. Share Instantly. Celebrate Together.**

NexaInvite is the first live SaaS product from NexaForge Technologies, bringing digital invitations, guest management and event experiences together in one platform.
