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
architecture worked out that session). Scope: **Auth → Dashboard → Template Gallery →
Invitation Editor (create/save/publish) → Guest List → Public RSVP page** (NexaInvite), plus
**Home → Products → Product landing → Services → Pricing → Careers → About → Contact**
(NexaForge corporate). Payments, subscriptions, notifications, media uploads, CSV export, admin
UI, real QR code image generation, and Docs/Blog/Case Studies are NOT implemented — see
README.md "Not yet implemented".

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
- **Tailwind v4**: no `tailwind.config.js` — theme tokens (brand colors, Poppins/Inter fonts)
  are defined via `@theme inline` in `frontend/src/app/globals.css`. Colors/fonts sourced from
  `Documentation/Brand Guidelines.MD`.

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
locally"), then either repeat this flow manually or write a small Playwright script — the
project's Playwright package resolves via `npx playwright --version` but browsers are cached
per-user at `~/.cache/ms-playwright/`; on this machine the installed build is `chromium-1208`
(pin `executablePath` to `~/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome` — the
default `chromium.launch()` looks for a version-mismatched `chromium_headless_shell` build that
isn't present).

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

## Where to pick up next

1. Natural next features, in priority order per the PRD: real QR code image generation
   (`qrcode` Python package) instead of the placeholder URL string, CSV guest export, the
   billing/subscription screens, admin panel UI, template thumbnail images (currently
   CSS-rendered placeholders, no real images).
3. If deploying beyond local dev: switch `DB_ENGINE=postgres`, set a real `SECRET_KEY`, set
   `DEBUG=False`, configure `ALLOWED_HOSTS`.
