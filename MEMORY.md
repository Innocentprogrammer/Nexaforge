# NexaInvite Prototype — Working Memory

Read this file first in any new session on this project, before re-reading `Documentation/`.
It exists so you don't have to re-derive the whole doc set from scratch every time.

## What this project is

NexaInvite: AI-assisted digital invitation / event-management platform (wedding-first), by
NexaForge Technologies. Full source docs live in `Documentation/` (26 files — PRD, API spec,
DB design, tech stack, UI screens, brand guidelines, etc). The two PRDs disagree in scope;
`NexaInvite-Complete-PRD.MD` is the leaner MVP one — that's the one this build follows.

## Status: NexaInvite MVP + NexaForge corporate site, both smoke-tested end-to-end

Built 2026-07-14 (NexaInvite MVP), extended 2026-07-19 (NexaForge corporate marketing site
unifying it with the product app — one nav, one design system, one login, per the ecosystem
architecture worked out that session), tiered guest invites added 2026-08-16, **tier moved from
the guest to the host account + PDF export added 2026-08-17**, then a full macOS-inspired UI
redesign on 2026-08-19 (visual only — no logic, endpoint, route or workflow changed). Scope:
**Auth → Dashboard → Template Gallery → Invitation Editor (create/save/publish) → Guest List
(CSV import, invite-link export, per-guest PDFs, WhatsApp/SMS sends — all gated on the host's
`subscription_tier`) → Public RSVP page** (NexaInvite), plus
**Home → Products → Product landing → Services → Pricing → Careers → About → Contact**
(NexaForge corporate). Payments/billing, notifications, media uploads, general CSV export, admin
UI, real QR code image generation, and Docs/Blog/Case Studies are NOT implemented — see
README.md "Not yet implemented". **Tier exists but is not sellable: there is no billing, so
`subscription_tier` is read-only in the API and moved by CLI/admin only.**

### 2026-07-19 addition: NexaForge corporate site

Previously the frontend was NexaInvite-only — no corporate marketing pages existed at all,
just the product app. Added, grounded in `Documentation/Website Blueprint.MD` +
`Documentation/Brand Guidelines.MD` (the real brand spec: light-mode-first, Deep Navy
`#0B1F3A` / Electric Blue `#2563EB` / Emerald `#10B981`, Poppins/Inter/JetBrains Mono — **not**
the dark-navy/Montserrat palette from an unrelated Stitch mockup export reviewed the same
session, which was correctly discarded as non-canonical once this Documentation was found):

- **Backend**: two new Django apps, `products` (Product model: slug/name/status
  OPERATIONAL|BETA|COMING_SOON/href/order — seeded via `seed_products`: NexaInvite Operational,
  NexaCRM/NexaERP/NexaFlow/NexaAI Coming Soon) and `leads` (Lead model backing the Contact form
  and footer newsletter signup, `POST /api/v1/leads/`, scoped 5/hour anon throttle). Both follow
  the existing app conventions (UUID PKs, DRF ModelViewSet/CreateAPIView, `{success, message,
  data}` envelope matching `accounts`).
- **Frontend**: root `/` is now the NexaForge corporate Home (was NexaInvite's landing page —
  that content moved to `/products/nexainvite`). New pages: `/products` (fetches `/products/`
  API), `/products/nexainvite`, `/services`, `/pricing`, `/careers`, `/about`, `/contact` (posts
  to `/leads/`). New shared components: `SiteHeader`/`SiteFooter`/`MarketingShell` (used by all
  marketing pages), `AuthShell` (minimal home-link header for `/login` + `/register`).
  `DashboardShell`'s sidebar logo became a "NexaForge | Invite" lockup with a "← Back to
  nexaforge.com" link, matching the product-landing-page lockup. All pages are client components
  (`"use client"`), matching the codebase's existing pattern — no server-component/data-fetching
  split was introduced.
- **Deliberately unchanged**: `/i/[slug]` (public invitation page) has no NexaForge chrome by
  design — a wedding guest should see the host's invitation, not the SaaS vendor's nav. Nothing
  in `accounts`/`templates_app`/`invitations`/`guests`/`rsvp` was touched.
- **Verified**: `npm run build` — all 15 routes compile, zero TS errors. Dev server smoke-tested
  (all new + existing routes return 200, real content renders). Full pre-existing backend flow
  re-verified via curl after the changes (register → login → create invitation → publish →
  public view → RSVP → owner summary → guest list) — identical to the 2026-07-14 verification,
  confirming zero regression. Test data cleaned up after.

## Repo layout

```
Prototype/
├── Documentation/        (pre-existing product/business docs — source of truth for scope)
├── backend/               Django + DRF, apps: accounts, templates_app, invitations, guests, rsvp
│   └── venv/              already created, deps installed (see backend/requirements.txt)
├── frontend/              Next.js 16 (App Router) + TS + Tailwind v4
├── docker-compose.yml     Postgres + Redis + backend + frontend (optional; local dev defaults to SQLite, no Docker needed)
├── README.md              setup/run instructions
└── MEMORY.md              this file
```

## Key decisions (so you don't redo this analysis)

- **DB**: SQLite by default for zero-config local dev (`backend/config/settings.py` — set
  `DB_ENGINE=postgres` env var to switch, matches docs' Postgres target). UUID PKs everywhere,
  snake_case, matches `Documentation/Database Design.MD`.
- **Auth**: SimpleJWT, login by email (custom `User.USERNAME_FIELD = "email"` in
  `accounts/models.py`). Frontend stores access+refresh in localStorage
  (`frontend/src/lib/api.ts`), auto-refreshes on 401.
- **App name collision avoided**: Django app is `templates_app` not `templates` (would shadow
  Django's template-loader dir convention).
- **Invitation editor**: built as a structured form + live preview (title/venue/date/heading/
  subheading/message/colors), NOT a full drag-drop canvas — that's explicitly out of scope for
  "basic functionality," canvas editor is future work per the docs' Phase-2 "AI Designer."
  Autosave every 30s (`AUTOSAVE_DELAY_MS` in `frontend/src/app/invitations/[id]/edit/page.tsx`),
  matching PRD FR-011.
  - **Public RSVP self-registration**: guests aren't required to be pre-added — POST `/rsvp/`
  creates a Guest on the fly if no `guest_id` given (`backend/rsvp/serializers.py`). This isn't
  explicitly specified in the docs but is the sensible default for a public invite link.
- **Next.js 16 has breaking changes vs typical training data** — the scaffold ships an
  `AGENTS.md` telling agents to check `frontend/node_modules/next/dist/docs/` before writing
  code. Confirmed: dynamic route `params` is a `Promise` (use the `useParams()` hook in Client
  Components, which is what all pages here do — avoids the `use(params)` unwrap dance).
  Also (fixed 2026-08-16): Next 16 no longer overrides a global `scroll-behavior: smooth`
  during route transitions, so `globals.css`'s smooth scrolling made every navigation glide to
  the top instead of jumping. `<html>` in `layout.tsx` now carries `data-scroll-behavior="smooth"`
  to restore the old override — see
  `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` "Scroll Behavior Override".
- **Tailwind v4**: no `tailwind.config.js` — theme tokens (brand colors, Poppins/Inter fonts)
  are defined via `@theme inline` in `frontend/src/app/globals.css`. Colors/fonts sourced from
  `Documentation/Brand Guidelines.MD`. Since 2026-08-19 that file also carries the whole design
  system: a 4-level surface ramp (`--canvas` / `--background` / `--background-subtle` /
  `--surface-2`), a `--heading` text token, an elevation scale (`--elev-1..5`) wired into
  `--shadow-*`, an overridden radius scale (`rounded-lg` = 10px, `xl` = 14px, `2xl` = 18px),
  motion tokens, and a full dark palette under both `prefers-color-scheme` and `[data-theme]`.
  Read `frontend/README.md` "Design system" before adding a screen.

### 2026-07-20 addition: richer invitation templates + independent font color

User feedback: templates were "so simple" (flat single-color box, plain centered text) and
font color wasn't changeable — `accent_color` was doing double duty as both the text color
and the intended decorative accent, so there was no way to set them independently.

- **New `template_json`/`invitation_json` keys** (no backend model change needed — both are
  already `JSONField`): `font_color` (independent text color), `background_color_2` (gradient
  second stop), `pattern` (`none|frame|dots|sparkle|confetti|florals`). `accent_color` is now
  documented/labeled as decorative-only (borders/dividers), not text.
- **`frontend/src/components/invitation-canvas.tsx`** (new): the single shared renderer for
  gradient background + pattern overlay + heading/subheading/message in `font_color` with a
  chosen `heading_font`. Used by `templates/page.tsx` (gallery card), `invitations/[id]/edit`
  (live preview), and `i/[slug]` (public page) — previously each of those three hand-rolled its
  own slightly-different preview markup; consolidating avoids them drifting out of sync.
- **Two curated invitation-content fonts added** via `next/font/google` in `layout.tsx`:
  Playfair Display (`--font-playfair`) and Dancing Script (`--font-dancing`), alongside the
  existing Poppins/Inter. These are for user-authored invitation headings only, not NexaForge's
  own UI chrome — Brand Guidelines' Poppins/Inter/JetBrains Mono system is unchanged for the
  actual product interface.
- **`seed_templates.py` switched from `get_or_create` to `update_or_create`** — needed so
  re-seeding updates the 8 existing template rows in place (preserving their IDs, since one is
  FK-referenced by the real user's existing invitation) rather than silently doing nothing.
- **Public invitation page (`/i/[slug]`)** now washes the whole viewport in the invitation's
  gradient (previously just a plain page with a flat-colored text block) — the published card
  floats on top with a shadow.
- **Verified**: `npm run build` clean, then full browser verification via a throwaway
  `playwright-core` script (installed ad hoc in scratchpad, not a project dependency) driving
  the cached `chromium-1208` binary — screenshotted the gallery (8 visually distinct templates:
  gradients, frame/dots/sparkle/confetti/florals patterns, serif/script/sans headings all
  rendering), the editor (all 4 color pickers + 2 dropdowns present, changed Font Color from
  gold to red and confirmed the live preview's computed text color updated), and the published
  public page (immersive gradient, correct themed rendering). Zero console errors. Test
  user/invitation cleaned up after.

## API surface implemented (subset of `Documentation/API Specification.MD`)

Base `http://localhost:8000/api/v1/`. Full envelope `{success, message, data, meta}` mostly
followed (SimpleJWT's own login/refresh responses are the exception — flat body).

- `POST /auth/register/`, `POST /auth/login/`, `POST /auth/refresh/`, `POST /auth/logout/`
- `GET/PATCH /users/me/`
- `GET /templates/`, `GET /templates/{id}/` (filters: `category`, `premium`, `search`)
- `GET/POST /invitations/`, `GET/PATCH/DELETE /invitations/{id}/` (soft delete via `deleted_at`),
  `POST /invitations/{id}/publish/`, `POST /invitations/{id}/duplicate/`
- `GET /public/invitations/{slug}/` (no auth, published-only)
- `GET/POST /invitations/{id}/guests/`, `PATCH/DELETE /guests/{id}/`, `POST /guests/import/` (CSV)
- `POST /rsvp/` (public), `GET /invitations/{id}/rsvp/` (owner, includes summary in `meta`)
- `GET /products/`, `GET /products/{slug}/` (public, filter: `status`) — added 2026-07-19
- `POST /leads/` (public, throttled 5/hour/IP) — added 2026-07-19
- `GET /public/invite/{token}/` (public, per-guest link; carries `guest` + `host_tier`) — 2026-08-16
- `POST /invitations/{id}/guests/export-links/` (invite-links CSV, Gold+) — added 2026-08-16
- `POST /invitations/{id}/guests/send-diamond-invites/` (Diamond only; now the *re-send*, since
  import auto-sends), `GET /invitations/{id}/guests/send-status/` (Diamond only) — 2026-08-16
- `GET /invitations/{id}/pdf/` (generic invitation PDF, every tier),
  `GET /guests/{id}/pdf/` (per-guest personalised PDF, Gold+) — added 2026-08-17

Not implemented: `/payments/*`, `/subscriptions/*`, `/notifications/*`, `/media/*`, `/admin/*`
custom endpoints (Django admin at `/admin/` works — superuser `admin@nexainvite.com` / see below).

## Test credentials

- Superuser: `admin` / `admin@nexainvite.com` / password `admin123` (Django admin at `/admin/`)
- **DB is not empty** — it holds the project owner's own real accounts and invitations (created
  2026-07-14, e.g. `mratyunjay.rapidshyp@gmail.com` with a published invitation), not test data.
  Do not delete these. Any smoke-test users this session creates should be prefixed distinctly
  (e.g. `smoketest_*`) and cleaned up afterward via `User.objects.filter(email__startswith=...)`
  — deleting the `Invitation` first, then the `User` (FK is `RESTRICT`, not `CASCADE`).

## Verified working (2026-07-14)

Full flow browser-tested with Playwright end-to-end, zero console errors: register → empty
dashboard → create invitation from dashboard button → editor loads with live preview → edit
title/venue/heading, preview updates live → Save → Publish → public `/i/<slug>` page renders
correctly (no auth) → RSVP submitted from a separate browser context → owner's Guests & RSVPs
page shows the RSVP with correct ACCEPTED count. Screenshots taken at each step (not persisted
past the session, in `/tmp/e2e_*.png`). Backend was also independently verified via curl
(register/login/create/publish/public-view/rsvp/summary all returned correct payloads).

If you need to re-verify after future changes: start both servers (see README "Running
locally"), then either repeat this flow manually or write a small Playwright script.

**Browser binary (updated 2026-08-16 — the old note here is obsolete):** after the system
change, `~/.cache/ms-playwright/` no longer exists, so the previously documented
`chromium-1208` path is gone. Install `playwright-core` ad hoc in the scratchpad and pin
`executablePath: "/usr/bin/google-chrome"` (system Chrome, present on this machine). Two
things that keep biting: `fullPage` screenshots don't fire `<Reveal>`'s IntersectionObserver
(scroll in steps first), and the dev servers on :3000/:8000 are usually **already running**
from the owner's own session — don't kill them; start a second backend on :8001 with your test
env and rewrite the browser's API calls to it via
`context.route("**/api/v1/**", r => r.continue({url: r.request().url().replace("localhost:8000","localhost:8001")}))`.

### 2026-07-21 addition: header CTA removed, Profile page, NexaInvite landing overhaul

User feedback: the marketing header's "Launch App" button was noise, and there was no account
page — the app only had Dashboard + Templates in `DashboardShell`'s nav.

- **`SiteHeader`**: "Launch App" button removed entirely. Logged-out visitors now see just nav +
  "Log in" (register CTAs live in page hero sections instead, e.g. "Get Started — It's Free" on
  `/products/nexainvite`). Logged-in users see a profile avatar (initial circle) + name linking
  to `/profile`, replacing the old dashboard shortcut.
- **New `/profile` page** (`frontend/src/app/profile/page.tsx`): third `DashboardShell` nav item
  alongside Dashboard/Templates. Shows avatar/name/email/verified+role badges, an editable
  full_name/phone form (PATCH `/users/me/`, calls `refreshUser()` after save — email is
  read-only), and a member-since/account-type info card. No new backend work needed — reuses the
  existing `accounts.MeView`.
- **`/products/nexainvite` overhauled** to be more attractive/complete: hero now has a 3-card
  stacked `InvitationCanvas` mockup (wedding/birthday/corporate samples, rotated CSS transforms,
  no real images needed), added a stats bar, expanded features 4→6 with icon glyphs, a template
  showcase section (reusing the same 3 sample cards + a "who it's for" use-case grid), and an FAQ
  section. Deliberately did NOT add fabricated customer testimonials/reviews — used FAQ + use-case
  info instead, since those are safe factual content vs. fake social proof.
- **Verified**: `npm run build` clean (16 routes, zero TS errors), then full Playwright smoke test
  (chromium-1208, same pinned-binary approach as the 2026-07-20 session): logged-out header has no
  Launch App button, register → dashboard → logged-in header shows profile avatar → clicked into
  `/profile` → edited name+phone → save confirmed → `DashboardShell` sidebar shows Dashboard/
  Templates/Profile. Zero console errors. Test user cleaned up after
  (`User.objects.filter(email__startswith="smoketest_ui_").delete()`).

### 2026-07-21 addition #2: shared animation system + home page overhaul

> **Partly superseded by the 2026-08-19 redesign.** The animation *names* below still exist
> (`fade-in`, `fade-in-up`, `float`, `pulse-soft`, `gradient-pan`, `.reveal`, `.card-hover`,
> `.nav-underline`) but their timings/easings were retuned, `Button`'s scale micro-interaction
> became a lift + press, and the icon glyphs (⚙✦✓☁) were replaced by `components/ui/icon.tsx`.

User feedback: wanted animation across both NexaForge (corporate) and NexaInvite (product), and
the NexaForge home page (`/`) specifically made more attractive.

- **Shared animation infrastructure** (`globals.css` + new `components/reveal.tsx`), used by both
  ecosystems since they share the same component tree: keyframes `fade-in`/`fade-in-up`/`float`/
  `pulse-soft`/`gradient-pan`, a `.reveal`/`.reveal.is-visible` pair driven by the `<Reveal>`
  client component (IntersectionObserver, fires once, optional `delay` prop for stagger), and a
  `.card-hover` utility (lift + shadow + border-color on hover). Everything is gated behind
  `@media (prefers-reduced-motion: reduce)` — animations/transitions collapse to instant/static,
  except `.animate-float`'s static rotation (via a `--rot` CSS custom property) is preserved so
  tilted card mockups don't snap upright.
- **`Button`** now has a universal `hover:scale-[1.02] active:scale-[0.97]` micro-interaction
  (`components/ui/button.tsx`) — applies everywhere since Button is shared by both the marketing
  site and the product app.
- **`MarketingShell`/`DashboardShell`** mains get `animate-fade-in` — a subtle page-enter fade on
  every route in both ecosystems.
- **`SiteHeader`**: nav links get an animated underline (`.nav-underline`, shown on hover or the
  active route), logo has a subtle hover scale.
- **Home page (`/`) overhaul**: hero gained two blurred pulsing gradient blobs behind the content,
  staggered fade-in-up entrance on badge/heading/copy/buttons, and a new right-side "ecosystem"
  visual — 3 floating stacked cards (NexaInvite/NexaCRM/NexaAI, gradient-tinted, `animate-float`
  with staggered delays) replacing the old empty space. Stats/product-teaser/services-teaser/
  why-us sections now scroll-reveal with per-item stagger via `<Reveal>`; services teaser gained
  icon glyphs (⚙✦✓☁). Bottom CTA section's flat navy background became an animated diagonal
  gradient pan. Deliberately did NOT touch `/i/[slug]` (no chrome, no shell) or add anything
  requiring new deps — everything is Tailwind + vanilla CSS keyframes, no animation library.
- **NexaInvite landing (`/products/nexainvite`)**: same hero-blob + fade-in-up treatment; the
  3-card stacked mockup (already there from the previous session) now uses `animate-float` with
  staggered delays instead of being static; every section below (stats/features/showcase/
  workflow/FAQ/CTA) wrapped in `<Reveal>` with stagger; feature/showcase/use-case cards got
  `.card-hover`; pricing CTA got the same animated gradient treatment as home's CTA.
- **Also applied `.card-hover`** to the live app's template gallery (`/templates`), dashboard
  invitation cards (`/dashboard`), and the `/products` listing cards — these count as "NexaInvite"
  too (the running product, not just its marketing page), and reuse the same utility class rather
  than each page inventing its own hover treatment.
- **Verified**: `npm run build` clean (16 routes), then Playwright smoke test (chromium-1208):
  screenshotted home hero + scroll-revealed sections, nexainvite hero + features + showcase +
  FAQ, and a card-hover lift on `/templates`. Zero console errors. No test data created this
  session (no register/login flow needed for a visual-only change).

### 2026-07-21 addition #3: Services/Pricing/Careers/About/Contact UI pass

> **Partly superseded by the 2026-08-19 redesign** — the *content* added here (pricing FAQ,
> careers benefits strip, about stat strip, contact channel rows) all survives; the glyph icons
> and hero-blob markup were reworked onto the new design system.

Extended the same visual language (hero blobs, `<Reveal>` stagger, `.card-hover`, animated CTA
gradient) to the five remaining marketing pages, which had been plain header+card-grid since the
2026-07-19 corporate-site build with no animation and no icons.

- **`/services`**: hero got blobs + fade-in-up; each of the 6 service cards got an icon glyph
  (⚙✦✓☁◆⚑) + `.card-hover` + stagger; bottom CTA switched from flat `bg-background-subtle` to the
  same animated navy gradient used on home/nexainvite for visual consistency across all page-end
  CTAs.
- **`/pricing`**: hero animated; tier cards reveal-stagger, all three get `.card-hover`, the
  highlighted "Pro" tier additionally gets a `sm:-translate-y-2` static offset (applied to a
  wrapper div, deliberately NOT the `<Reveal>` div itself — putting a static Tailwind transform
  utility directly on the `.reveal` element would fight the class's own animated `transform`).
  Added a 3-item pricing FAQ section (billing/guest-limit/refund — new content, not just restyled).
- **`/careers`**: added a 4-item benefits strip (Remote-first/Flexible hours/Equity/Learning
  budget, new content) above the existing hiring-pipeline/open-roles sections; both of those plus
  the benefits strip now stagger-reveal; role cards get `.card-hover`; the mailto "Apply" button
  gets the same hover/active scale micro-interaction as `Button`.
- **`/about`**: added a 4-stat strip (Founded 2026/Products live/roadmap/in-house engineering,
  reusing figures already stated elsewhere on the site — not fabricated) between hero and
  mission/vision; mission/vision cards get `.card-hover`; value pills get individual stagger +
  hover-lift instead of appearing all at once.
- **`/contact`**: hero + form fade in; each contact channel became a `.card-hover` row with an
  icon chip (✉ email, ◆ sales, "in" for LinkedIn); success state gained a checkmark icon.
- **Gotcha hit and fixed**: `fullPage` Playwright screenshots do NOT trigger `<Reveal>`'s
  IntersectionObserver (no real scroll event fires), so initial verification screenshots showed
  blank/invisible below-fold sections — false alarm, not a real bug. Fixed verification by
  programmatically `window.scrollTo` in steps down the page before capturing (same pattern now
  worth reusing for any future full-page screenshot of a `<Reveal>`-using page).
- **Verified**: `npm run build` clean, then Playwright pass over all 5 pages with the scroll-step
  technique above (zero console errors), plus a functional contact-form submit
  (`smoketest_ui_contact@example.com` → success state rendered, POST to `/leads/` succeeded) and a
  `.card-hover` hover check on `/pricing`. Test lead cleaned up after
  (`Lead.objects.filter(email__startswith="smoketest_ui_").delete()`).

### 2026-08-16 addition: guest tiers — gold invite-link export + diamond WhatsApp/SMS sends

> **PARTLY SUPERSEDED by the 2026-08-17 section below — read that first.** Everything here about
> tokens, `senders.py`, the Twilio diagnosis, phone normalisation and the two-phase
> send/reconcile is still current and still the implementation in use. What changed on
> 2026-08-17: **`Guest.tier` no longer exists.** So ignore, in this section, every reference to a
> per-guest tier — the tier select on the add form, the CSV `tier` column, the tier badge column,
> "gold guests only" filtering, `filter(tier=Guest.Tier.DIAMOND)`, and especially "Tier has to be
> set per guest… it is not inferred from anything". Tier is now `invitation.user.subscription_tier`
> and is inferred from exactly that.

Two requested features on the guest-management flow, both additive. Guests could at this point
carry a **tier** (`GOLD` / `DIAMOND` / blank); blank behaved exactly as before.

- **`Guest` model changes** (`guests/migrations/0002` + `0003`): `tier`, `unique_token`
  (16-char `secrets.token_urlsafe`, unique, auto-generated), `invite_opened_at`, and
  `phone` **renamed to** `phone_number` with an E.164 `RegexValidator`. New `InviteSendLog`
  model (guest FK, channel, status, provider_message_id, provider_error, timestamps).
  - Two migration gotchas hit here, both worth remembering: (1) `makemigrations` did **not**
    detect the phone rename (the new field also gains a validator) and emitted an
    AddField/RemoveField pair that would have dropped the 3 real guests' phone data — the
    migration is hand-corrected to `RenameField` + `AlterField`. (2) A callable default on a
    unique field is evaluated **once per migration, not per row**, so `unique_token` is added
    non-unique in 0002, backfilled row-by-row in 0003's `RunPython`, then altered to unique.
  - Pre-existing phone values (e.g. `8445518517`) are not E.164 and stay as-is; the validator
    only runs on serializer writes, so those rows can't be re-saved via the API unedited.
- **Feature 1 (gold)**: `POST /invitations/{id}/guests/export-links/` returns a real CSV file
  download (`name,email,unique_invite_url`) for gold guests only — CSV, not XLSX, to match
  what `/guests/import/` already consumes. `GET /public/invite/{token}/` **subclasses**
  `invitations.views.PublicInvitationView` rather than reimplementing it, so the
  published/soft-delete rules and payload stay identical; it just adds a `guest` key and
  stamps `invite_opened_at` on first open.
- **Feature 2 (diamond)**: Celery task `guests.send_diamond_invites` — WhatsApp first, and on
  a Twilio failure meaning the number isn't on WhatsApp it retries the same message over SMS.
  **The fallback codes were looked up, not guessed: 63003** ("Channel could not find To
  address" — docs name an unregistered WhatsApp number as a cause) **and 63024** ("Invalid
  message recipient" — Meta says not enabled for WhatsApp / ToS not accepted / unsupported
  client). Deliberately *excluded* 63013 (content/policy) and 63016 (outside the 24h freeform
  window) — those are message problems, not reachability, so SMS-retrying them would mask a
  real error. Sends are sequential with `INVITE_SEND_DELAY_SECONDS` between them (not
  concurrent) for Twilio's rate limit.
  - **A WhatsApp success does NOT also send an SMS.** Double delivery is gated behind
    `INVITE_SEND_DUPLICATE_SMS` (default `False`) because it doubles cost and volume for
    guests already on WhatsApp — the owner asked to be consulted before enabling it, and has
    not. Don't flip this default without asking.
- **Pluggable send backend** (`guests/senders.py`): `INVITE_SEND_BACKEND=console` (default)
  logs and simulates, `twilio` does real sends. `INVITE_SEND_CONSOLE_UNREACHABLE` lists
  numbers the console backend should fail as 63003 — that's how the SMS-fallback path is
  exercised with no live account or spend.
- **Config**: new deps `celery`/`redis`/`twilio` in `requirements.txt`; `config/celery.py` +
  `config/__init__.py` wire the Celery app. `CELERY_TASK_ALWAYS_EAGER` defaults to **True** so
  local dev works with no worker running; set it False and run
  `celery -A config worker -l info` (Redis from `docker-compose.yml`) for real async.
  Credentials come from **`NEXAINVITE_`-prefixed** env vars (owner's choice, to avoid
  colliding with other `TWILIO_*` vars on the host) — see the new `backend/.env.example`.
  **`backend/.env` does not exist yet**; the owner still needs to create it with real Twilio
  values before `INVITE_SEND_BACKEND=twilio` will work.
- **Frontend**: Guest List page gained a Tier column + tier select on the add form,
  "Export Gold Invite Links (n)" (only rendered when gold guests exist), "Send Diamond
  Invites (n)", and a Diamond Invite Delivery table that polls `send-status/` every 2s while
  `meta.in_flight`. New `downloadFile()` helper in `lib/api.ts` for authenticated blob
  downloads (the envelope-parsing `apiFetch` can't handle a file body);
  `CORS_EXPOSE_HEADERS = ["Content-Disposition"]` added so the browser can read the filename.
- **New route `/invite/[token]`** — the export writes `{FRONTEND_URL}/invite/{token}` URLs, so
  a page had to exist or every exported link would 404. To avoid a second copy of the public
  page, `/i/[slug]`'s markup was extracted verbatim into
  `components/public-invitation-view.tsx` and both routes now render it — same consolidation
  reasoning as `invitation-canvas.tsx`. **`/i/[slug]`'s styling and behaviour are unchanged**
  (verified: still no guest prefill, still self-registration). The token route additionally
  prefills the guest's name and posts `guest_id` so the RSVP is attributed instead of creating
  a duplicate guest row.
- **Verified**: `manage.py check` clean, `makemigrations --check` clean, `npm run build` clean
  (17 routes, zero TS errors). A backend script exercised import/export/token/send/error/
  ownership/E.164 paths. Then full Playwright e2e against a **real Celery worker + Redis**
  (not eager mode), so the polling was genuinely in flight: CSV import with tier+phone columns
  → tier badges render → export button shows "(2)" → download captured and CSV contents
  asserted (gold only, correct header, real URLs) → opened a gold guest's link, invitation
  rendered with name prefilled and `invite_opened_at` stamped → `/i/[slug]` confirmed unchanged
  → Send Diamond Invites → status line observed transitioning
  `2 pending → 1 pending → 0 pending` → final table shows Rohan/WhatsApp/SENT and
  Meera/SMS/SENT (the stubbed-unreachable number), one log row per guest (no duplicate SMS).
  Zero console errors. Test user/invitations cleaned up after (3 real guests untouched).

#### 2026-08-16 follow-up: Add Guest 400'd on normal phone input

Reported straight after the above: `POST /invitations/{id}/guests/` returning `400 74`. The
74-byte body was exactly the new E.164 validator message — the owner typed `8445518517` (a bare
10-digit Indian mobile, the same spelling already in the DB), and strict E.164 rejected it.
Three separate faults, all fixed:

- **The validator rejected the format people actually type.** E.164 storage was a requirement,
  so the fix is normalisation, not dropping validation: new `guests/phone.py`
  `normalize_phone_number()` handles `+91 98765-43210`, `(+91) …`, `0091…`, `09876543210` and
  bare `9876543210`, applying `GUEST_DEFAULT_COUNTRY_CODE` (default `+91`, env-overridable)
  only to plausible national numbers. Genuinely unplaceable input (`12345`, `abcdef`) is
  returned unchanged so it still fails validation rather than having a country code invented
  for it.
  - **Gotcha**: DRF runs a field's own validators *before* `validate_<field>`, so simply adding
    `validate_phone_number` did nothing — the model's `E164_VALIDATOR` fired first. The
    serializer now redeclares `phone_number` with `validators=[]` and checks `E164_RE` itself
    after normalising.
- **The UI hid the reason.** `ApiError` only read a `message` key, but DRF field errors are
  bare maps like `{"phone_number": ["…"]}` — so every validation failure surfaced as
  "Bad Request". `lib/api.ts` gained `extractErrorMessage()` (message → detail → flattened
  field errors), used by both `apiFetch` and `downloadFile`. This improves error reporting
  across every form in the app, not just this one.
- **CSV import silently bypassed validation.** `Guest.objects.create()` runs no validators, so
  an imported `8445518517` was stored as-is while the API rejected the same value — and Twilio
  would have failed on it later. Import now normalises through the same function.
- **Migration `0004`** normalises pre-existing rows (the owner's two `8445518517` guests are now
  `+918445518517`, i.e. actually sendable). Conservative: only rewrites rows that map cleanly to
  valid E.164, leaves anything else for a human.
- **Verified**: normaliser unit cases (10 spellings incl. blanks), API accepts bare national /
  messy E.164 / blank and still 400s on unplaceable input with a readable message, CSV import
  normalises all three forms, full earlier backend suite re-run green, `npm run build` clean,
  and a browser check replaying the exact failing form submission (guest added, stored
  `+918445518517`) plus confirming the error text now reads the real field message instead of
  "Bad Request".

#### 2026-08-16 follow-up #2: "no Twilio message arrives"

Reported as "I've included all the APIs but get no message". Nothing was actually wired up —
two independent blockers, neither of them a code bug:

- **`backend/.env` did not exist.** The owner had `.env.example` open in the IDE and believed
  that was the config; `python-decouple` reads **only** `.env`. All five `NEXAINVITE_TWILIO_*`
  settings were empty and `INVITE_SEND_BACKEND` was therefore still `console` — the simulated
  backend that logs, marks rows SENT, and contacts nobody. That is exactly the
  "UI says sent, phone stays silent" symptom. Created `backend/.env` (gitignored; verified with
  `git check-ignore`) with the keys laid out and `INVITE_SEND_BACKEND=twilio`.
  **`.env.example` is NOT gitignored — never put real credentials in it.**
- **No guest was diamond tier.** All 4 guests on "Wedding invitation" had `tier=(none)`, and
  `InviteSendLog.objects.count()` was 0, proving the task had never run. `send_diamond_invites`
  only targets `tier=DIAMOND`, and the button is gated on `diamondCount > 0`, so there was
  nothing to send. Tier has to be set per guest (dropdown on the add form, or the CSV `tier`
  column) — it is not inferred from anything.
- **Two robustness fixes made off the back of this** (`guests/tasks.py`): a failure building the
  sender (e.g. backend=twilio with empty credentials) used to raise out of the task, leaving the
  status table stuck on PENDING with no explanation — it now writes a FAILED row per guest
  carrying the reason. And an unexpected provider/network error on one guest is caught per-guest
  so it can't abort the batch and strand the rest. Verified: with twilio selected and empty
  creds, both guests come back FAILED with "…these settings are empty: TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN…" visible in the UI.
- **Still outstanding for the owner** (can't be done from here): fill the five values in
  `backend/.env`, restart the Django server (decouple reads at import time), and mark guests
  Diamond. On a Twilio trial/sandbox the recipient must first join the sandbox
  ("join <code>" to the sandbox number), and business-initiated messages outside the 24h window
  need the approved template SID.

**Second report of "still no message"** — guests were now correctly Diamond (2 on "Wedding
invitation"), but `NEXAINVITE_TWILIO_ACCOUNT_SID` and `..._AUTH_TOKEN` were **still empty**;
only `WHATSAPP_FROM` had been filled. `InviteSendLog.objects.count()` was still 0, which
explains why the UI gave no hint: on the pre-fix code `get_sender()` raised *before* any log
row was written, and because `CELERY_TASK_EAGER_PROPAGATES = False` the eager task swallowed
the exception while the endpoint still returned `202 "Queued invites for 2 guests"`. So the
UI looked fine and the table simply stayed empty. The follow-up fix above makes this case
write FAILED rows instead. Also noted: the running server had started 14s *before* the last
`.env` save, so it held stale config regardless — **`.env` edits never trigger runserver's
autoreload** (it only watches `.py`), a restart is always required.

**Third report, resolved 2026-08-16 — messages now actually deliver.** Diagnosed from the
owner's Twilio account rather than guesswork. Four real faults on top of the config being
simulated:

1. `INVITE_SEND_BACKEND` was back to `console` (the owner had replaced `.env` with a copy of
   `.env.example`). Log rows with `provider_message_id='console-wa-…'` are the tell-tale.
2. **The credentials in `.env` were Twilio's Test Credentials** (`403 Resource not accessible
   with Test Account Credentials`) — those never send. The live pair was sitting in
   `.env.example`; moved into `.env` and the tracked template scrubbed.
3. `WHATSAPP_FROM` lacked the `whatsapp:` prefix; `TEMPLATE_SID` held the message *text*
   instead of an `HX…` Content SID.
4. **`+18154269192` is SMS/voice/MMS only, not a WhatsApp sender** — every WhatsApp send failed
   `63007`. Account history settled it: `whatsapp:+18154269192` → 6 failures, whereas
   **`whatsapp:+14155238886` (the sandbox) → 5 messages `read`**, i.e. the sandbox works and the
   recipient has already joined. `.env` now uses the sandbox sender with `+18154269192` as the
   SMS fallback. Both verified with real sends: SMS `delivered`, WhatsApp `read`.

- **Behaviour change**: with no WhatsApp sender configured the task now goes straight to SMS
  instead of failing every guest on an unusable channel. Genuine sender errors (63007, 21606,
  21608, 63018) still fail loudly and now carry an actionable hint appended to Twilio's text.
- **`FRONTEND_URL` was `http://localhost:3000`, so 7 already-sent invites contained dead
  links** — `localhost` on a phone is the phone. Backend `.env` (`FRONTEND_URL`,
  `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`) and `frontend/.env.local` now point at the LAN IP
  `192.168.1.21`. **Django must be started as `runserver 0.0.0.0:8000`** — it binds 127.0.0.1
  by default, which no phone can reach. Re-check the IP after any network change; for sending
  to people outside the LAN this needs a tunnel or a real deployment.
- **Security**: live Auth Token had been typed into `.env.example`, which is NOT gitignored.
  Scrubbed, but **the token should be rotated**.

**Fourth report ("test messages arrive, the button doesn't") — resolved, 2026-08-16.** The UI
path failed with `20422 Invalid Parameter` while `check_twilio` worked, because `.env` had
regressed between the two: `TEMPLATE_SID` again held the message *text* (passed as
`content_sid` -> 20422) and `WHATSAPP_FROM` had lost its `whatsapp:` prefix. Both were fixed,
and `senders.py` is now defensive about both — it adds the `whatsapp:` prefix if missing, and
**ignores a TEMPLATE_SID that doesn't start with `HX`**, logging a warning and sending a plain
body instead of emitting an undiagnosable 20422. Re-ran the real task: 7 attempted, **5
delivered** to +918445518517.

**RESOLVED (same day) — see the reconcile-pass note at the end of this section.**

**Known limitation, discovered here — the SMS fallback cannot fire on asynchronous failures.**
The 2 sends to +918755045280 failed with `63015` (recipient never joined the WhatsApp sandbox;
enrolment also lapses after 3 days). Twilio *accepts* those at the API call — status `queued` —
and only marks them `failed` seconds later. `TwilioSender._create` only sees synchronous
`TwilioRestException`s plus an already-`failed` status, so it recorded SENT and no fallback ran.
63015 was added to `WHATSAPP_UNREACHABLE_CODES` (it is recipient-side reachability, unlike
63007), but that only helps for synchronous cases. **Closing this properly needs post-send
reconciliation** — re-fetch each message SID a few seconds later, update the log, and send the
SMS fallback then — or a Twilio status-callback webhook (needs a public URL; the owner has a
devtunnel). Not built yet; agreed to be offered rather than assumed.

Also: on this **trial** account only `+918445518517` is a verified caller ID, so `+918755045280`
cannot be reached by SMS either (21608) until it is verified in the console, joins the sandbox,
or the account is upgraded.

**Async fallback implemented (2026-08-16).** `TwilioSender.confirm_delivery(sid)` polls a message
until it reaches a terminal status (`delivered`/`read` vs `failed`/`undelivered`), controlled by
`INVITE_SEND_CONFIRM_ATTEMPTS` (6) and `INVITE_SEND_CONFIRM_INTERVAL` (2.0s). `send_diamond_invites`
is now **two-phase**: send every message first, then reconcile. Phase 2 matters for speed — doing
the confirm inline per guest would add ~12s each and, under `CELERY_TASK_ALWAYS_EAGER=True`
(the local default), that runs *inside the HTTP request* and would hang the browser. Sending
first lets the statuses settle in parallel; a 2-guest live run took 12s total. `confirm_delivery`
returning `None` (still in flight) deliberately keeps the optimistic SENT rather than risking a
duplicate send. Phase 2 also corrects the `sent`/`failed` tallies and un-sets `invitation_sent`
for guests whose message later failed, and is where the opt-in `INVITE_SEND_DUPLICATE_SMS` copy
is triggered (only once delivery is actually confirmed).

Verified live end-to-end: `+918445518517` -> WhatsApp SENT/delivered; `+918755045280` -> WhatsApp
accepted, async `63015`, **automatically fell back to SMS**, which then failed `21608` because
that number is not a verified caller ID on the trial account. The fallback logic is correct; the
remaining failure is purely a Twilio trial restriction and is now shown in the status table.

Also fixed: `Guest.unique_invite_url` had been hardcoded to the devtunnel *root*, which dropped
the per-guest token — every guest would have got the same anonymous link and
`/public/invite/{token}/` could not resolve anyone. Restored to `{FRONTEND_URL}/invite/{token}`
with `FRONTEND_URL` pointed at the tunnel instead. **Caveat**: the tunnel exposes :3000 only, so
a remote guest loads the page but its API calls still go to `localhost:8000` and the invitation
won't render — port 8000 needs its own tunnel, with `NEXT_PUBLIC_API_BASE_URL` set to it.

New: **`python manage.py check_twilio [--to +91…] [--channel sms|whatsapp]`** (`guests/management/commands/`) — reports
which settings are missing, authenticates against Twilio, warns about trial-account/sandbox
restrictions, and optionally does one real send printing the exact provider error code. Use
this instead of clicking through the UI when diagnosing delivery. It never prints credential
values.

### 2026-08-17: tier moved from Guest to User; PDF export; Diamond auto-send

The open question at the end of the 2026-08-16 session ("should tier be the *host's* plan rather
than a per-guest column?") was answered: **yes**. Tier is now `User.subscription_tier`
(`NORMAL` / `GOLD` / `DIAMOND`, default NORMAL, cumulative — each tier includes the ones below).
`Guest.tier` is gone, along with its dropdown on the add-guest form, the CSV `tier` column and
the tier badge column. Everything from yesterday — unique tokens, `/public/invite/{token}/`,
`normalize_phone_number()`, `senders.py`, and the two-phase send/reconcile in
`send_diamond_invites` — is **reused unchanged**; only the querysets that used to filter on
`Guest.tier` were repointed.

- **`accounts.models`**: `SubscriptionTier` choices + `TIER_RANK`/`tier_at_least()`/`tier_rank()`
  helpers, `User.subscription_tier`, `User.has_tier()`/`is_gold_or_better`/`is_diamond`.
  Frontend mirror: `hasTier()` in `lib/types.ts`. **Always compare with these, never `===
  "GOLD"`** — "Diamond includes Gold" has to hold in both codebases.
- **`subscription_tier` is read-only in the API** (`accounts/serializers.py`) on purpose: there
  is no billing, so a writable field is a self-service paywall bypass. Move accounts with the new
  **`python manage.py set_subscription_tier <email> GOLD`** (`--list` prints every account's
  tier) or the Django admin. The e2e tests use that command. If billing ever lands, that's the
  place to hook it.
- **Migration `guests/0005_move_tier_to_user_subscription`** — the tier-mapping decision, since
  the information is destroyed once the column is dropped:
  - An owner may have had a mix of gold/diamond/untiered guests. We take the **highest tier
    present across all of that owner's guests**, because tiers are cumulative and promoting is
    the only mapping that can't silently remove a feature somebody was using.
  - **Only ever promotes, never demotes** (an account already above what its guests imply is
    left alone). Untiered guests don't count as a competing tier — blank meant "no claim".
  - Every affected invitation is `logger.warning`'d (owner email, invitation id/slug, the tier
    set its guests carried, resulting owner tier), with an extra explicit MIXED-tier warning when
    the set had more than one value. That log is the only audit trail.
  - **On the real DB it promoted exactly one account**: `mratyunjay.rapidshyp@gmail.com` →
    DIAMOND (invitation `untitled-invitation-652cb07c` had 3 DIAMOND + 2 untiered guests, so the
    set was `{DIAMOND}` — no mixed-tier collapse actually occurred). The other two accounts stay
    NORMAL. A pre-migration copy of `db.sqlite3` was taken but is not persisted.
  - The reverse migration re-adds the column and back-fills every guest of a gold/diamond host
    with that host's tier. It is the closest inverse available, **not** a true rollback.
- **PDF export — `invitations/pdf.py`, ONE renderer for all three tiers**:
  `render_invitation_pdf(invitation, guest_name=None)`. `guest_name=None` → the plain invitation
  page (Normal, and the generic download on every tier); a name → the *same* page with a
  personalised "Hi {name}" cover page in front of it (Gold/Diamond), worded identically to the
  `/invite/{token}` greeting so the two can't drift. Not three templates.
  - **reportlab, not WeasyPrint or a headless browser** — pure Python, no cairo/pango, no
    Chromium download, so `pip install -r requirements.txt` still works on a bare machine.
    Nothing in requirements.txt could already do PDFs (Pillow only). Trade-off: the invitation is
    re-drawn with reportlab primitives rather than reusing the React/CSS markup, so the *data* is
    shared (`invitation_json` over `template_json`, exactly as the editor preview merges them)
    but the drawing code isn't — **keep `_draw_pattern`/`FONT_BY_KEY` in step with
    `components/invitation-canvas.tsx` when adding a pattern or font.** reportlab ships only the
    14 standard PDF fonts, so playfair/dancing map to Times and poppins/inter to Helvetica.
  - **Per-guest PDFs are rendered on demand, not stored at import time.** The brief said
    "generated per guest at import time"; rendering is deterministic and cheap, and on-demand
    means the PDF can never be stale relative to an invitation edited after the import. The
    observable behaviour (a per-guest download per guest) is the same. If real stored files are
    ever wanted, that's a MEDIA_ROOT + cleanup story.
  - Frontend: "Download PDF" on the editor header, the guest page header, and each dashboard
    card (the card's button had to move **outside** the `<Link>` or clicking it navigates).
    Per-guest "PDF" link per row in the guest table, Gold+ only.
- **Diamond import auto-sends, with no confirmation step** (this reverses the first draft of the
  brief, which had a second "Send Invites" click). `POST /guests/import/` → normalise → validate
  → dedupe → `send_diamond_invites.delay(invitation_id, guest_ids)` in the same request. Because
  there is no confirm step, the response's `meta` **is** the host's only record of a bad upload,
  and the UI renders all of it (`data-testid="import-summary"`). The upload form carries a
  standing warning ("Invites are sent automatically on import… re-uploading a file sends to it
  again") so a repeat upload isn't a surprise.
- **`send_diamond_invites(invitation_id, guest_ids=None)`** — the only change to the task: an
  optional id list. Rows the import excluded are never passed, so they get **no InviteSendLog row
  at all**, not a row with a failed status. Tier is no longer checked inside the task; the
  endpoint's permission class gates it. Everything else (WhatsApp-first, 63003/63015/63024
  fallback, sequential delay, two-phase reconcile, `INVITE_SEND_DUPLICATE_SMS` still default
  False) is untouched.
- **`guests/importer.py`** (new, split out of `views.py`): parse → create *every* named row as a
  Guest (rows are never dropped — the host couldn't recover them) → decide which are safe to
  send. Reports `duplicates` (name + number + `collapsed_onto`) and `rejected` (name + raw value
  + reason) so both are visible after the fact.
- **The "10 digit" rule — `indian_national_digits()` in `guests/phone.py`. FLAG FOR FUTURE
  SESSIONS: Diamond sends are India-only by deliberate choice, not by accident.** A value must be
  exactly 10 digits after stripping non-digits and a leading `+91`/`91`/`0091`/`0`. `+1…`,
  `+44…`, 5-digit and 11-digit values are **excluded from the send batch** and listed as "not
  sent — invalid number format". Do **not** assume international numbers work for Diamond guests;
  widening this is a product decision someone has to make on purpose. Two deliberate
  non-decisions: the first digit is *not* constrained to the 6-9 mobile series (landlines
  exist), and this is a **pre-filter only** — `normalize_phone_number()` still runs for storage
  on every row, and Twilio's delivery-time errors (63003/63015/63024/21608…) remain the
  authority on reachability.
- **Dedup is by normalised national number within one import batch**, first row wins the send
  slot; later rows are still created as guests (a "typo'd name" duplicate is data the host may
  want) but excluded from the send. Not cross-batch: re-uploading the same file *will* send
  again, which is why the warning above exists.
- **Access control** — `guests/permissions.py`: `RequiresSubscriptionTier` base +
  `CanImportGuests` (Gold+), `CanUsePerGuestLinks` (Gold+, links CSV and per-guest PDF),
  `CanSendInvites` (Diamond). The 403 message names both the required plan and the account's
  actual one, so a NORMAL host can't get a silent no-op. `export-links/` lost its
  "gold guests only" filter — it's all guests now, because the gate is on the host.
- **`send-status/` only lists guests with at least one delivery attempt.** Previously it listed
  `tier=DIAMOND` guests; showing an import-excluded guest as "pending" for ever would
  misrepresent what happened.
- **`/invite/[token]` greeting**: the token payload gained `host_tier`, and the page passes
  `greetingName` to `PublicInvitationView` only when `hasTier(host_tier, "GOLD")`. **`/i/[slug]`
  never passes it** — verified in the browser: no greeting element, no guest name anywhere in the
  body, RSVP name still blank for self-registration. Diamond is a superset of Gold's page
  treatment (assumed, and it matches "tiers are cumulative").
- **One real bug the e2e caught**: right after a Diamond import the delivery line briefly read
  `0 sent · 0 failed · 0 pending` (the pre-import totals) while a send was genuinely in flight —
  reads as "nothing happened". `importGuests` now seeds `sendMeta` optimistically from
  `queued_for_send` before the first status fetch lands.
- **Verified**: `manage.py check` clean, `makemigrations --check` clean, `npm run build` clean
  (17 routes, zero TS errors). An 87-check backend script covered the number pre-filter (13
  spellings incl. `+1`/`+44`/5-digit/11-digit), the shared renderer (1 page vs 2, name present
  vs absent — asserted with `pdftotext`, which is on this machine along with `pdfinfo`/`pdftoppm`),
  all three tiers on every endpoint, cross-owner 404s, and the exact log-row counts. Then a
  58-check Playwright run (system Chrome, backend on :8001 with `INVITE_SEND_BACKEND=console`
  — **never point a test at the real `.env`, it has live Twilio credentials and
  `INVITE_SEND_BACKEND=twilio`**; env vars beat `.env` in python-decouple, which is how the
  override works): NORMAL is 403'd on import with the plan named and still downloads a
  name-free PDF; GOLD imports, exports links for all guests, downloads two correctly-named
  per-guest PDFs, and sees "Hi Asha Rao, you're invited" positioned above the card (asserted by
  bounding box) while `/i/[slug]` shows none of it; DIAMOND's 3-row CSV (duplicate number,
  `12345`, one valid) produced summary 1 collapsed / 1 rejected / 1 sent, exactly one delivery
  row, and a second import re-verified the WhatsApp→SMS fallback (2 sent, Meera on SMS). A
  10-check DB pass then confirmed **2 log rows total, none for the collapsed duplicate and none
  for the rejected row** — absent, not failed. Zero unexpected console errors (the deliberate
  403 is the only one Chrome logs). Test users cleaned up
  (`smoketest_tier_*`, `smoketest_e2e_*`); the owner's 6 guests and 11 real send logs untouched.

### 2026-08-19 addition: macOS-inspired UI redesign — design system + every screen

User asked for a premium/macOS-inspired visual overhaul of the whole app with **functionality
100% unchanged**: no logic, endpoint, payload, route, auth or workflow changes, no feature
removals. Visual/UX/responsiveness/motion only. (The brief described the app as a "logistics
platform" — it isn't; the direction was applied to NexaForge/NexaInvite as it stands.)

**Zero new dependencies.** No component library, no icon package, no animation library — the
system is hand-built on Tailwind v4 + vanilla CSS, continuing the 2026-07-21 precedent.

- **Design system in `globals.css`** (rewritten, ~800 lines): 4-level surface ramp, `--heading`
  token, brand hues unchanged per Brand Guidelines §12, status colors, `--border`/`--border-strong`,
  glass + scrim tokens, `--elev-1..5` → `--shadow-*`, radius scale (10/14/18px), motion tokens
  (`--ease-spring` = `cubic-bezier(0.32,0.72,0,1)`, 120/200/320ms), 8px spacing rhythm. Shared
  component classes: `.glass`/`.glass-strong`, `.data-table` (sticky header + row hover),
  `.skeleton` shimmer, `.spinner`, `.progress-track`, `.tt` (CSS-only tooltips), `.press`,
  `.ambient`, `.page-enter`. Everything decorative collapses under `prefers-reduced-motion`.
- **Dark mode is now complete** (it was 4 tokens before, and headings were unreadable). Every
  token has a dark value under `prefers-color-scheme` **and** `:root[data-theme="dark"]`, plus a
  `@custom-variant dark` so `dark:` utilities honour both. Deep neutrals, no pure black, lifted
  surfaces. **No toggle UI was added** (that's a feature) — setting `data-theme="dark"` on
  `<html>` is all a future toggle needs.
- **New primitives** in `components/ui/`: `icon.tsx` (single hand-drawn set, 24×24 grid, 1.75
  stroke, sizes 13/14/16/18/20/24), `skeleton`, `alert`, `toast` (provider mounted in
  `layout.tsx`), `empty-state`, `segmented`, `page-header` (breadcrumbs). **Extended**: `button`
  (+`size` 32/36/44px, `loading`, `IconButton` with tooltip+aria-label, `inverse` variant for
  dark panels), `input` (+`Select`, `FileInput`, `Hint`, `FieldError`, 36px heights, macOS focus
  halo, `data-state` validation), `card` (+`CardHeader`, `StatCard`, `Divider`, badge dots and
  `info`/`brand` tones).
- **Convention**: inline `Alert` for anything a user must be able to re-read (validation, import
  summaries, plan gates); `useToast()` only for transient confirmations (currently just the
  profile save). Deliberate — auto-dismissing an import summary would lose information.
- **Shells**: `DashboardShell` gained a collapsible sidebar (state persisted in localStorage),
  nav icons, a rail-style active indicator, tooltips when collapsed, a real sub-nav for the
  invitation you're inside (Editor / Guests & RSVPs, derived from the pathname), a mobile
  off-canvas drawer with scrim, a glass sticky header and an account dropdown (Esc/outside-click,
  `role="menu"`). `SiteHeader` goes transparent → frosted on scroll and got a proper mobile sheet
  replacing the horizontally-scrolling link row. `AuthShell` is now a floating sheet on a lit
  canvas. `ProtectedRoute` renders a shaped skeleton instead of "Loading…".
- **Screens**: dashboard (stat tiles derived from the already-fetched list — no new requests —
  plus card previews via `InvitationCanvas`, skeletons, empty state); guests & RSVPs (`.data-table`
  with sticky headers, 5 stat tiles, side-by-side add/import, alert-based plan gates, delivery
  table with in-flight progress bar); editor (sectioned form, colour wells with hex readouts,
  styled selects, sticky live preview, save-state indicator); templates (segmented category
  filter, gallery on a tinted canvas); profile, login/register (validation states), contact,
  public invitation + RSVP (frosted sheet, polished loading/not-found), and all marketing pages.
- **Two affordance changes worth knowing** (nothing else moved): `/templates` previously rendered
  with **no** navigation chrome at all and now sits in `MarketingShell`, and its page-level
  "Log in" button was dropped because that header already provides one.
- **Deliberately NOT done, with reasons**: no confirmation dialog on destructive actions (e.g.
  guest "Remove" fires immediately today — adding a step is a workflow change), so the sheet
  *language* went onto surfaces that already exist (drawer, dropdown, toasts); no notification
  bell and no global search (neither feature nor data exists — it would be fake UI); no
  client-side table sorting (new interaction, not styling); `invitation-canvas.tsx` untouched
  since it renders the host's own content, including its decorative ✦/❁ glyphs.

**Tailwind v4 / React 19 gotchas hit this session — all worth remembering:**

- `body` now paints `--canvas` while `--background` stayed the *surface* colour. That one split
  is what let cards keep their contrast without editing `bg-background` in ~35 files.
- 68 headings used `text-primary`, but dark mode needs light headings while `bg-primary` must
  stay navy (Button `secondary`, file input). Fixed by adding `--heading` and renaming the class
  usages (`text-primary` → `text-heading`, regex-guarded so `text-primary-foreground` survived).
- A self-referential entry inside `@theme inline` (`--ease-spring: var(--ease-spring)`) is
  invalid and silently poisons the block — alias raw values instead (`--elev-*` → `--shadow-*`).
- Don't set `border-radius` in a global `:focus-visible` rule: it reshapes the focused element.
  The outline already follows each element's own radius.
- Tailwind v4's important modifier is **trailing** (`my-6!`), not leading (`!my-6`).
- Conflicting utilities resolve by **stylesheet source order, not class-attribute order**, so
  passing `className="border-white"` to override a variant's `border-border` is a coin flip.
  That's why dark-panel buttons got a real `inverse` variant and the guest-row remove button is
  a plain styled `<button>` rather than an `IconButton` with overrides.
- A global element selector (`input[type="color"]`) outranks utility classes, so the colour well
  is styled in `globals.css` and the editor only sets size/radius.
- `eslint react-hooks/set-state-in-effect` (React 19 config) rejects the obvious patterns for new
  UI state: the sidebar's localStorage read uses `useSyncExternalStore` (server snapshot =
  expanded, so no hydration mismatch) and menus close in link `onClick` handlers instead of a
  `pathname` effect.
- **Verified**: `next build` clean (16 routes), `tsc --noEmit` clean, `eslint` at **5 errors /
  0 warnings** — the same 5 pre-existing `set-state-in-effect` errors listed under "Where to pick
  up next", with 2 baseline warnings fixed. All 12 routes return 200 on the dev server and the
  SSR HTML was diffed for content. Behaviour preservation was checked mechanically: every
  `api.*` call, endpoint string and `data-testid` in the touched screens diffed **identical** to
  `HEAD`. No Playwright pass this session — no browser tooling was available, so there are **no
  screenshots**; a visual sweep (light + dark, mobile + desktop) is still worth doing.
- Design-system reference added to `frontend/README.md`; agent-memory notes under
  `~/.claude/projects/-usr-Mratyunjay-Saxena-Prototype/memory/`.

## Where to pick up next

0. **Immediate**: `backend/.env` exists with live Twilio credentials and
   `INVITE_SEND_BACKEND=twilio` — treat it as loaded. The Auth Token that was once typed into
   `.env.example` **still ought to be rotated**. Note `FRONTEND_URL` points at a devtunnel;
   see the 2026-08-16 caveat about port 8000 needing its own tunnel.
1. Natural next features, in priority order per the PRD: real QR code image generation
   (`qrcode` Python package) instead of the placeholder URL string, full CSV guest export
   (only the gold invite-links export exists so far), the billing/subscription screens, admin
   panel UI, template thumbnail images (currently CSS-rendered placeholders, no real images).
3. If deploying beyond local dev: switch `DB_ENGINE=postgres`, set a real `SECRET_KEY`, set
   `DEBUG=False`, configure `ALLOWED_HOSTS`.
4. **UI follow-ups from the 2026-08-19 redesign**, none blocking: run a visual sweep of all
   screens in light *and* dark and on mobile widths (the redesign was verified by build/lint/
   route checks and SSR diffing, not screenshots); a dark-mode toggle is one `data-theme`
   attribute away if wanted; the 5 pre-existing `react-hooks/set-state-in-effect` errors
   (`app/dashboard/page.tsx`, `app/invitations/[id]/guests/page.tsx`, `app/templates/page.tsx`,
   `lib/auth-context.tsx`) are data-loading effects and need a logic change, so they were left
   alone — treat 5 errors / 0 warnings as the lint baseline. Anything genuinely new that the
   redesign left on the table because it would have been fake UI: notifications, global search,
   destructive-action confirmations, table sorting.
