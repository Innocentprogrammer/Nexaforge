# Phase 9 — Production Readiness Report

Status: **IN PROGRESS. Audit complete; Stages 1–7 of 9 done.** NexaInvite is **not** production-ready yet.

Status keys used below: PASSED, FAILED, BLOCKED, NOT TESTED, RECOMMENDATION.

## 1. Baseline (recorded 2026-11-15, before any Phase 9 change)

| Item | Result |
| --- | --- |
| Branch / working tree | `master`, clean (HEAD `6c6fc46`) |
| Backup | `~/Downloads/NexaInvite-backups/phase9-pre-20261115/` (mode 700): `project.tar.gz` (source, `.env`, DB, media, `.git`; no `node_modules`/`venv`), `db.sqlite3` (online SQLite backup, `integrity_check = ok`), `media.tar.gz` |
| Active database | SQLite `backend/db.sqlite3` |
| Migrations | 51 applied, 0 pending (`migrations-before.txt`) |
| Data counts | users 5, invitation templates 20, products 10, invitations 9, guests 14, RSVPs 5, payments 9, subscriptions 9, plans 3, media assets 1, notifications 22, leads 1 (`data-counts-before.txt`) |
| URL routes | 218 (`routes-before.txt`) |
| `manage.py check` | PASSED, 0 issues |
| `manage.py check --deploy` | FAILED, 6 warnings (W004 HSTS, W008 SSL redirect, W009 SECRET_KEY, W012 session cookie, W016 CSRF cookie, W018 DEBUG) |
| `pip check` | PASSED |
| `manage.py test` | PASSED, 105 tests |
| `npm run build` | PASSED |
| `npm run lint` | FAILED, 8 errors and 2 warnings, all pre-existing (`set-state-in-effect` ×6, `rules-of-hooks` ×1 in `templates/page.tsx`, unescaped entity ×1, `<img>` warnings ×2) |
| `npm audit --omit=dev` | FAILED, 4 vulnerabilities (1 critical: `next@16.2.10`; high: bundled `postcss`, `sharp`) |
| `pip-audit` | FAILED: Django 6.0.7 (3 advisories, fixed in 6.0.8), djangorestframework 3.17.1 (5, fixed in 3.17.2), Pillow 12.3.0 (42, fixed in 13.0.0) |
| Secrets in git | PASSED. No `.env` was ever committed; `.env.example` history holds placeholders only |

## 2. Audit findings

Severity reflects a production deployment.

| ID | Severity | Finding | Location |
| --- | --- | --- | --- |
| AUD-01 | CRITICAL | `SECRET_KEY` falls back to a key published in the repo, and `DEBUG` defaults to `True`. Neither is set in `backend/.env` or compose, so both defaults are live. JWTs are signed with this key. | `config/settings.py:12-17` |
| AUD-02 | HIGH | Compose hardcodes Postgres credentials `nexainvite/nexainvite`, publishes 5432 and 6379, Redis has no password, and there are no health checks | `docker-compose.yml` |
| AUD-03 | HIGH | `COPY . .` with no `.dockerignore` puts `.env`, `db.sqlite3`, `media/` and `venv/` into the image | `backend/Dockerfile` |
| AUD-04 | HIGH | `frontend/Dockerfile` is missing, so `docker compose build` cannot succeed | `frontend/` |
| AUD-05 | HIGH | `runserver` and `npm run dev` are used in containers; source is bind-mounted | compose, Dockerfile |
| AUD-06 | HIGH | No HTTPS redirect, secure cookies, HSTS or `CSRF_TRUSTED_ORIGINS` | settings |
| AUD-07 | MEDIUM | Access and 7-day refresh tokens in `localStorage`. Logout clears tokens before its request runs, so after the access token expires the refresh token is never revoked. Rotated refresh tokens stay valid (`BLACKLIST_AFTER_ROTATION=False`). | `frontend/src/lib/api.ts`, `auth-context.tsx:65-74`, settings |
| AUD-08 | HIGH | Login, register and token refresh have no throttling; neither does public RSVP or the public invite pages | `accounts/views.py`, `rsvp/views.py` |
| AUD-08b | HIGH | Every IP throttle can be bypassed with a forged `X-Forwarded-For` (no `NUM_PROXIES`). Throttle counters live in per-process LocMemCache. | settings `REST_FRAMEWORK`, no `CACHES` |
| AUD-09 | MEDIUM | Activity log trusts the first `X-Forwarded-For` value, so the recorded IP can be spoofed | `admin_portal/activity.py:60-68` |
| AUD-10 | LOW | CORS origins are explicit (good), but there is no production configuration and no `CSRF_TRUSTED_ORIGINS` | settings |
| AUD-11 | MEDIUM | Media is served only when `DEBUG=True`; production has no media serving at all. EXIF/GPS is not stripped. `profile_image` upload has no size or format limits. | `config/urls.py:21`, `media_manager`, `accounts/models.py:60` |
| AUD-12 | MEDIUM | No production static serving (admin CSS), no `collectstatic` step | settings, Dockerfile |
| AUD-13 | MEDIUM | No `LOGGING` config, no health endpoint, no error-monitoring hook | settings |
| AUD-14 | MEDIUM | No backup or restore procedure | — |
| AUD-15 | MEDIUM | No container health checks; `depends_on` is start order only | compose |
| AUD-16 | MEDIUM | Migrations and seeding run on every backend container start | compose `backend.command` |
| AUD-17 | LOW | Twilio sends only check that a phone number is non-empty. Self-registered RSVP guests (unvalidated phone) are included in "Resend to all", which is an SMS-pumping path. | `guests/tasks.py`, `rsvp/serializers.py:61-71` |
| AUD-18 | LOW | Email retries every error, including permanent rejections. The password-reset URL (a credential) is passed as a Celery argument and sits in Redis. | `notifications/tasks.py`, `accounts/views.py:170` |
| AUD-19 | MEDIUM | Celery has no time limits, `acks_late` or worker concurrency settings. Tier expiry depends on Beat; if Beat is down, paid tiers never expire. | settings, `subscriptions/tasks.py` |
| AUD-20 | PASSED (with notes) | `.env` files are gitignored and never committed. `NEXT_PUBLIC_*` holds only the API URL. Razorpay and Twilio secrets are backend-only. The image leak is covered by AUD-03. | — |
| SEC-01 | MEDIUM | Gold "per-guest links" gate is bypassed: `GuestSerializer` returns `unique_invite_url` to every tier | `guests/serializers.py:35-49` |
| SEC-02 | MEDIUM | Public RSVP can create unlimited guests, has an unbounded `message`, and emails the host on every submission | `rsvp/` |
| SEC-03 | LOW | Premium and deactivated templates can be used by any tier via the API (needs a product decision) | `invitations/serializers.py` |
| SEC-04 | LOW | Soft-deleted invitations are still reachable through guest and RSVP owner endpoints (owner's own data only) | `guests/views.py:26,75`, `rsvp/views.py:153` |
| SEC-05 | LOW | A non-UUID `invitation_id` on CSV import returns a 500 | `guests/views.py:75` |
| SEC-06 | LOW | Buying a lower plan while a higher one is active expires the higher one without credit | `subscriptions/views.py:50-59` |
| SEC-07 | LOW | Razorpay error details are passed to the client; create-order is unthrottled | `subscriptions/gateway.py`, `views.py` |
| SEC-08 | LOW | `select_for_update` does nothing on SQLite (verify and webhook race). Correct on Postgres, which production will use. | `subscriptions/views.py:36` |
| DEP-01 | CRITICAL | `next@16.2.10` has published advisories, including RCE in the image optimizer, which the app uses | `frontend/package.json` |
| DEP-02 | HIGH | Pillow 12.3.0 (42 advisories) parses user uploads; Django 6.0.7 and DRF 3.17.1 also need patch updates | `backend/requirements.txt` |

**Verified correct (no change needed):**
- **Object ownership:** no cross-customer IDOR was found. Every invitation, guest, RSVP, media, notification, payment and subscription query is scoped to `request.user`.
- **Admin access:** every `/admin/*` endpoint requires staff, and staff/superuser changes are guarded.
- **Razorpay:**
  - Amounts come from the server.
  - The HMAC is checked with `compare_digest` and the payment is re-fetched from the gateway.
  - Webhooks are signed and idempotent.
  - There is no test-mode bypass.
- **Password reset:** single-use, expiring, revokes all sessions, and does not reveal whether an account exists.
- **Injection:** no raw SQL and no `mark_safe` / `dangerouslySetInnerHTML`.
- **Media uploads:** validated with Pillow, limited to 10 MB and JPEG/PNG/WEBP, stored under UUID filenames.

## 3. Remediation plan (staged; tests after every stage)

| Stage | Covers | Notes |
| --- | --- | --- |
| 1. Dependencies | DEP-01, DEP-02 | `next` 16.4.6, Django 6.0.8, DRF 3.17.2, Pillow 13.0.0. Full test suite, build, and a PDF/upload check. |
| 2. Django production settings | AUD-01, 06, 10, 12, 13 (logging and health) | `ENVIRONMENT=production` enforces: required `SECRET_KEY`, `DEBUG=False`, HTTPS, secure cookies, HSTS, explicit hosts/CORS/CSRF. Dev stays as it is. Adds `/api/v1/health/`, structured logging, Whitenoise for static files. |
| 3. Throttling and abuse | AUD-08, 08b, 09, 17, SEC-02, SEC-07 | Login, register, refresh, RSVP, public invite and create-order scopes; `NUM_PROXIES` and a trusted-proxy IP helper shared with the activity log; Redis cache in production; RSVP phone validation and message cap; self-registered guests left out of bulk sends. |
| 4. Application fixes | SEC-01, 04, 05, AUD-11 (profile image, EXIF), AUD-18, AUD-19 | Gate invite URLs by tier, soft-delete filters, UUID validation, Celery time limits and `acks_late`, permanent-error handling, request-time tier expiry check. |
| 5. Auth hardening | AUD-07 | Fix the logout race and verify token ownership (low risk). HttpOnly-cookie migration is a separate decision; see question below. |
| 6. Docker and production stack | AUD-02, 03, 04, 05, 15, 16 | `.dockerignore`, gunicorn, multi-stage frontend image, internal network, Redis password, health checks, a one-off `migrate`/`seed` service, a reverse-proxy (nginx) config for media and static. Then build, `up`, `ps`, and health checks against a **fresh, separate** Postgres volume. |
| 7. Ops docs | AUD-14 | Backup and restore scripts, with a verified restore into a scratch database; deployment and rollback guide; production `.env.example`. |
| 8. Frontend quality | lint baseline | Fix the 8 lint errors properly; evaluate Vitest and Playwright and add smoke tests. |
| 9. Final regression and docs | §5 testing, deliverables | API, payment (test-mode signatures only), email (locmem/test inbox), Celery; update README, MEMORY, Roadmap; finalize this report. |

**Not planned:** S3 media migration. Storage will become *configurable* (`django-storages`, off by default), but existing files stay on disk; no automatic migration without a verified copy and rollback plan.

## 4. Results

### Stage 1: Dependency security updates (2026-11-15), COMPLETE

| Package | Before | After | Why this version |
| --- | --- | --- | --- |
| Django | 6.0.7 | 6.0.8 | Patch release that fixes 3 advisories. Stayed on the 6.0 line, not 6.1. |
| djangorestframework | 3.17.1 | 3.18.2 | 3.17.2 still had 3 advisories, fixed only in 3.18.2. 3.18.2 supports Django 5.2–6.1; simplejwt and django-filter set no upper bound on DRF. |
| Pillow | 12.3.0 | 13.0.0 | Fixes 42 advisories. ReportLab 5 requires `pillow>=9`. |
| next / eslint-config-next | 16.2.10 | 16.4.6 | Same major version. Fixes the critical advisories and the bundled postcss/sharp. Pinned exact. |
| source-map-js (transitive) | 1.2.1 | patched | `npm audit fix` updated the lockfile only. No `--force`. |

| Check | Status | Detail |
| --- | --- | --- |
| `pip-audit -r requirements.txt` | PASSED | No known vulnerabilities |
| `python -m pip check` | PASSED | No broken requirements |
| `manage.py check` | PASSED | 0 issues |
| `manage.py test` | PASSED | 105/105 |
| PDF rendering on Pillow 13 | PASSED | All 9 live invitations rendered, generic and personalised, as valid `%PDF-` |
| Existing uploaded media on Pillow 13 | PASSED | The 1 existing asset opens and verifies |
| `npm audit --omit=dev` | PASSED | 0 vulnerabilities |
| `npm audit` (including dev) | RECOMMENDATION | One moderate `minimatch` advisory inside `@typescript-eslint`, pulled in by `eslint-config-next`. Dev/lint tooling only, never shipped. The only fix is a breaking `--force`; revisit when eslint-config-next updates it. |
| `npm run build` | PASSED | No warnings or deprecations |
| `next start` smoke test | PASSED | `/`, `/products/nexainvite`, `/pricing`, `/login`, `/templates`, `/dashboard`, logo and icon all return 200 |
| `npm run lint` | FAILED (baseline) | Unchanged: 8 errors, 2 warnings, all pre-existing. Scheduled for Stage 8. |

Files changed: `backend/requirements.txt`, `frontend/package.json`, `frontend/package-lock.json`.
Rollback: restore those three files from git (`git checkout -- <files>`), then run `pip install -r requirements.txt` and `npm ci`.

### Stage 2: Django production settings, logging, health checks (2026-11-15), COMPLETE

Covers AUD-01, AUD-06, AUD-10 (settings side), AUD-12 (Django static) and AUD-13.

**What changed**

- **`DJANGO_ENV` switch** (default `development`). The local `.env` doesn't set it, so local behaviour is unchanged.
- **With `DJANGO_ENV=production`, Django refuses to start (`ImproperlyConfigured`) when:**
  - `SECRET_KEY` is missing, is the public dev key, starts with `django-insecure`, or is shorter than 50 characters
  - `DEBUG=True`
  - `ALLOWED_HOSTS` is empty or contains `*`
  - `CORS_ALLOWED_ORIGINS` is empty, `*`, or not `https://`
- **Production-only security settings:**
  - `SECURE_SSL_REDIRECT`
  - `SECURE_PROXY_SSL_HEADER` (switchable with `TRUST_X_FORWARDED_PROTO`)
  - secure session and CSRF cookies
  - HSTS: `SECURE_HSTS_SECONDS` defaults to 3600 for a safe rollout. Include-subdomains and preload are explicit opt-ins.
- **Security settings for every environment:** nosniff, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `X-Frame-Options: DENY`, HttpOnly and `SameSite=Lax` cookies, `CORS_ALLOW_ALL_ORIGINS=False`.
- **`CSRF_TRUSTED_ORIGINS`** is configurable and defaults to the CORS list.
- **Static files:** WhiteNoise 6.12.0 (supports Django 6.0) with `CompressedManifestStaticFilesStorage` in production; plain storage in development.
- **Logging:**
  - `config/logging.py`: JSON lines in production, text in development.
  - The redaction filter scrubs bearer tokens, JWTs, `password`/`secret`/`token`/`api_key`/`signature` values, per-guest invite paths and reset links.
  - `django.request` errors are optionally emailed via `ADMINS`.
- **Celery:** failures and retries are logged centrally (`config/celery.py`), without task arguments, since password-reset links travel as arguments.
- **Error monitoring:**
  - `config/monitoring.py`: Sentry is used only if `SENTRY_DSN` is set and `sentry-sdk` is installed, with `send_default_pii=False`.
  - Frontend: `src/lib/report-error.ts` is the single reporting hook.
- **Health endpoints** (`config/health.py`, served as the first middleware):
  - `GET /api/v1/health/`: liveness.
  - `GET /api/v1/health/ready/`: database, plus cache and broker when they're in use; returns 503 on failure, with no error details in the response.
  - Both work over plain HTTP and with any Host header, for container probes.
- **Frontend error pages:**
  - `src/app/error.tsx`: styled fallback with Try again / Go to home, using Next 16.4's `retry()` API.
  - `src/app/global-error.tsx`: root-layout fallback with inline styles.
- **`backend/.env.example`** documents every new variable, with placeholders only.

**Results**

| Check | Status | Detail |
| --- | --- | --- |
| `check --deploy` with a valid production env | PASSED | 0 issues with HSTS subdomains and preload enabled. With the defaults, only W005/W021 remain; these are intentional opt-ins. All 6 baseline warnings are resolved. |
| Production refuses insecure config | PASSED | Each case was tested in a fresh process: missing key, dev key, `DEBUG=True`, `ALLOWED_HOSTS=*`, `http://` CORS. A mutation check confirmed the test fails when the config is broken. |
| Development defaults | PASSED | `DEBUG=True`, no SSL redirect, HSTS 0, non-secure cookies |
| Production behaviour (test client) | PASSED | `http` redirects 301 to `https`; HSTS `max-age=3600`; `X-Frame-Options: DENY`; unknown host returns 400; hashed admin CSS returns 200 through WhiteNoise after `collectstatic` (157 files) |
| Health endpoints | PASSED | 200 liveness and readiness with any Host; 503 on database failure with no details leaked |
| Log redaction | PASSED | Password, bearer, JWT, token, secret and invite-link values scrubbed; ordinary text untouched |
| Celery failure logging | PASSED | Task name logged, arguments (reset link) not logged |
| `pip check` / `manage.py check` | PASSED | |
| `manage.py test` | PASSED | 120/120 (105 existing + 15 new in `config/tests.py`) |
| Migrations / data | PASSED | `makemigrations --check`: no changes. Counts identical to baseline. |
| `npm run build` | PASSED | |
| `npm run lint` | FAILED (baseline) | Unchanged: 8 errors, 2 warnings. New files lint clean. |
| Error pages rendered in a browser | NOT TESTED | They compile and build. They only appear when a page crashes, which wasn't triggered manually. |

**Not covered here, by design:**
- Media serving in production: the nginx config comes in Stage 6. Until then `/media/` is served only when `DEBUG=True`.
- Redis cache and `NUM_PROXIES` belong to Stage 3.

**Rollback:** revert `backend/config/settings.py`, `celery.py`, `.env.example` and `requirements.txt` in git; delete `config/health.py`, `logging.py`, `monitoring.py`, `tests.py`, `frontend/src/app/error.tsx`, `global-error.tsx` and `src/lib/report-error.ts`. No database changes to undo.

#### Stage 2 follow-up

The health URLs also answer without the trailing slash (`/api/v1/health`, `/api/v1/health/ready`). They are served by middleware, so Django's `APPEND_SLASH` redirect never applies to them. A test now covers this.

### Stage 3: Throttling and abuse protection (2026-11-15), COMPLETE

Covers AUD-08, AUD-08b, AUD-09, AUD-17 (SMS-pumping path), SEC-02 and SEC-07.

**What changed**

- **Rate limits** (`config/throttling.py`, rates in `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`):

  | Scope | Limit | Applied to |
  | --- | --- | --- |
  | `login` | 20/min per IP | `POST auth/login/` |
  | `login_email` | 20/hour per account, across IPs | `POST auth/login/`. The email is SHA-256 hashed in the cache key. |
  | `register` | 10/hour per IP | `POST auth/register/` |
  | `token_refresh` | 120/min per IP | `POST auth/refresh/` (several tabs refresh at once) |
  | `rsvp` | 60/hour per IP | `POST rsvp/`. Generous because guests may share venue Wi-Fi. |
  | `public_page` | 300/min per IP | `GET public/invitations/{slug}/`, `GET public/invite/{token}/` |
  | `payment_order` | 20/hour per user | `POST payments/create-order/` |
  | `password_reset`, `leads` | 10/hour, 5/hour | Unchanged |

  The Razorpay webhook is deliberately not throttled.
- **Trusted proxies:**
  - `NUM_PROXIES` defaults to 0 in development (`X-Forwarded-For` ignored) and 1 in production (behind nginx).
  - The same rule is used by DRF throttles and by the new `config/net.py:client_ip`, which the Activity Log now uses. A forged header can no longer reset a rate limit or write a fake IP into the log.
- **Shared cache:**
  - Production now requires `CACHE_URL` (Redis), so rate-limit counters are shared by all workers.
  - Development uses an in-memory cache.
  - Tests use a dummy cache so unrelated tests never trip a limit; the throttle tests switch a real cache on.
- **Public RSVP:**
  - The phone number stays optional, but when given it is normalised to E.164 (`98765 43210` becomes `+919876543210`) or rejected.
  - The message is capped at 1000 characters.
  - New guests are marked `Guest.source = PUBLIC_RSVP`.
- **Diamond "Resend to All"** skips `PUBLIC_RSVP` guests and says how many it skipped. The host can still send to one individually.
- **Guest list UI:**
  - Self-registered guests get a "Self-registered" badge.
  - The "Resend to All Guests (n)" count only includes host-added guests.
  - A rate-limit (HTTP 429) shows "Too many attempts. Please wait a few minutes and try again."
- **Payments:** Razorpay error bodies and configuration messages are logged on the server. Customers see a plain "Payments are temporarily unavailable" or "couldn't complete this with the payment provider" message.
- **Migration `guests.0007_guest_source`:** additive only; existing rows get `HOST`.

**Results**

| Check | Status | Detail |
| --- | --- | --- |
| Per-IP login limit, including a forged `X-Forwarded-For` on every request | PASSED | The 4th request returns 429 at a 3/min test rate |
| Per-account login limit across rotating IPs | PASSED | Blocks that account only; other accounts unaffected |
| Register / RSVP / public page / payment-order limits | PASSED | RSVP limit doesn't block reading the invitation page |
| Configured production rates parse | PASSED | All 9 scopes load the intended values |
| `client_ip` | PASSED | 0 proxies ignores the header; 1 proxy takes the hop nginx appended; invalid input returns None |
| Activity Log IP | PASSED | A failed login with a forged header records the real socket address |
| RSVP phone validation, normalisation, optional phone, 1000-character cap | PASSED | |
| Send-all skips self-registered guests; individual send still works; clear 400 when only self-registered guests exist | PASSED | |
| Payment errors | PASSED | No gateway or config detail returned to the client; detail present in the server log |
| Production requires `CACHE_URL` | PASSED | Added to the production-settings tests |
| `manage.py test` | PASSED | 141/141 |
| Migration applied to dev DB | PASSED | 14/14 guests are `HOST`; counts unchanged |
| `tsc`, `npm run build` | PASSED | |
| `npm run lint` | FAILED (baseline) | Unchanged: 8 errors, 2 warnings |
| Throttling against live Redis | NOT TESTED | Needs the Redis service from Stage 6 |

**Known limitation:** guests created by the public RSVP link before this stage can't be identified for certain, so they stay `HOST`. A read-only heuristic (RSVP recorded in the same second the guest was created) finds **1** such guest in the dev database. It has a phone number and was never sent an invite. It was not relabelled automatically.

**Rollback:**
- Revert the changed files in git and delete `config/net.py`, `config/throttling.py` and `config/tests_abuse.py`.
- The `source` column is harmless if left in place. To remove it: `python manage.py migrate guests 0006`. That drops only the new column.

### Stage 4: Application fixes (2026-11-15), COMPLETE

Covers SEC-01, SEC-04, SEC-05, AUD-11 (profile image, EXIF), AUD-18 and AUD-19.

**What changed**

- **SEC-01 (Gold gate):** `GuestSerializer` omits `unique_token` and `unique_invite_url` unless the host is on Gold or above. This applies to the invitation guest list, `/guests/`, `/guests/{id}/`, and import results. The frontend never displayed these fields; its type now marks them optional.
- **SEC-04 (soft deletes):** a soft-deleted invitation now returns 404 from:
  - the guest list/add, import, export-links, send and send-status endpoints
  - `GuestViewSet` (guest detail, edit, delete, PDF)
  - the owner's RSVP list

  Rows are kept, only made unreachable.
- **SEC-05:** a non-UUID `invitation_id` on CSV import returns 400 instead of 500.
- **AUD-11:**
  - `profile_image` is read-only through `/users/me/`. The app never uploaded it, and that path skipped the media checks. Django admin can still set it.
  - New media uploads are re-encoded without EXIF/XMP (including GPS) after applying the camera orientation. Existing files are untouched.
- **AUD-18:**
  - The password-reset task now receives only the user id and builds the link itself, so the credential never sits in Redis. The old two-argument form is still accepted, so queued messages drain safely.
  - Notification emails no longer retry permanent failures: all recipients refused, an authentication error, or any 5xx reply. Temporary failures still retry.
- **AUD-19 (Celery):**
  - `acks_late` plus `reject_on_worker_lost`, `prefetch_multiplier=1`.
  - Default limits: soft 300s, hard 360s, configurable.
  - `guests.send_diamond_invites` is at-most-once (`acks_late=False`), with 3300/3400s limits, so a crash mid-batch can't text guests twice.
  - Redis `visibility_timeout` is 4200s, above the longest task.
  - Startup broker retry, results expire after one day, worker concurrency configurable.
- **Subscription expiry:**
  - On every authenticated request (`accounts/authentication.py`), a paid-tier user's ACTIVE subscription whose `ends_at` has passed is expired, using the same code as the scheduled task.
  - Accounts given a tier by an administrator, with no subscription row, are never downgraded.
  - The Beat job now runs hourly. The schedule key is unchanged, so persisted Beat state stays valid.
- **Test isolation:** `MEDIA_ROOT` points to a temp directory while tests run.

**Results**

| Check | Status | Detail |
| --- | --- | --- |
| Normal host gets no per-guest links; Gold still does | PASSED | List and detail endpoints |
| Soft-deleted invitation unreachable (6 endpoints) | PASSED | Guest row still exists |
| Malformed import id returns 400 | PASSED | |
| `profile_image` upload ignored; other profile fields still editable | PASSED | |
| JPEG with GPS and Orientation=6 | PASSED | Stored file has 0 EXIF tags and no GPS; rotated 60×30 → 30×60; `file_size` matches |
| Reset email | PASSED | Only the user id is queued; the email still contains a working reset link |
| Notification retries | PASSED | 550 refused is not retried; a disconnect is retried |
| Celery settings | PASSED | Global late-ack and limits; Diamond at-most-once; visibility timeout above the task limit |
| Request-time expiry | PASSED | Lapsed GOLD is downgraded on the next request and its subscription marked EXPIRED; a running plan is untouched; admin-granted DIAMOND is kept |
| Dev data affected by request-time expiry | PASSED (read-only check) | 0 active-but-ended subscriptions. The one admin-granted DIAMOND account keeps its tier. |
| `manage.py test` | PASSED | 154/154 |
| Migrations / data | PASSED | No schema changes this stage; counts and tiers unchanged |
| `tsc`, `npm run build` | PASSED | |
| `npm run lint` | FAILED (baseline) | Unchanged |
| Real worker with Redis (late ack, time limits) | NOT TESTED | Needs the Stage 6 stack |

**Found during this stage:** before this stage, `media_manager` tests wrote real files into `backend/media/user-media/`. There are **34 orphan 40×40 test PNGs** there that no `MediaAsset` row references. The one real upload is intact. They were **not deleted**; awaiting the owner's decision. Test runs no longer add files (35 before and after a full run).

**RECOMMENDATION (need a product decision, not changed):**
- **SEC-03:** premium or deactivated templates can be chosen by any plan through the API.
- **SEC-06:** buying a lower plan while a higher one is active expires the higher plan with no credit.

**Rollback:** revert the changed files in git and delete `config/tests_app_fixes.py`. No migrations this stage.

### Stage 5: Auth hardening and owner decisions (2026-11-16), COMPLETE

**Owner decisions (2026-11-16):**
- **SEC-03 (premium templates):** no restriction. Any plan may use any template. Closed, no change.
- **SEC-06 (buying a lower plan):** block it. Done below.
- **Orphan test PNGs:** delete if unused. Re-checked every file field in the database and searched the raw database for each file and folder name: none of the 34 were referenced. Deleted the 34 files and their empty folders. The 3 real uploads (2 media assets, 1 profile image) are untouched.

**Changes:**
- `accounts/views.py` `LogoutView`: the refresh token in the body is now the credential (`AllowAny`, throttled with the token-refresh rate). Logout works even when the access token has expired. If a valid access token is also sent, it must belong to the same user as the refresh token, otherwise 403. Missing token is 400; an expired, malformed or already-revoked token returns 200 with no activity log entry. The activity log records the token's owner.
- `frontend/src/lib/auth-context.tsx`: `logout()` is now async. It **awaits** the revoke call (5-second timeout) before clearing tokens, and sends it without the access token, so an expired access token can no longer trigger a refresh that rotates the very token being revoked (that left a live refresh token behind). `dashboard-shell.tsx` waits for logout before redirecting.
- `subscriptions/views.py` `CreateOrderView`: refuses to create an order for a plan ranked below a currently active, unexpired plan, with a message saying when the current plan ends. Upgrades and same-plan renewals still work; an active plan whose end date has passed doesn't block.
- Tests: `config/tests_stage5.py` (8 tests). `admin_portal/tests.py` logout call updated to send a real refresh token.

| Check | Result | Notes |
| --- | --- | --- |
| Backend tests | PASSED | 162 tests |
| `tsc --noEmit` | PASSED | |
| `npm run lint` | FAILED (baseline) | Unchanged: 8 errors, 2 warnings, all pre-existing |
| Manual logout in browser | NOT TESTED | For the owner to test |

**Known limitations:**
- `BLACKLIST_AFTER_ROTATION` stays off (multi-tab reason in settings). Logout revokes the current refresh token only; an older rotated refresh token from the same session stays valid until it expires (7 days). The HttpOnly-cookie stage is the place to revisit this.
- The downgrade check runs at order creation. An order created *before* buying a higher plan could still be paid afterwards and would replace the higher plan. Rare; would need the user to keep an old checkout open.

**Rollback:** revert `accounts/views.py`, `subscriptions/views.py`, `admin_portal/tests.py`, `frontend/src/lib/auth-context.tsx`, `frontend/src/components/dashboard-shell.tsx`; delete `config/tests_stage5.py`. No migrations. The deleted PNGs are in the pre-Phase-9 backup (`media.tar.gz`) except those created by test runs after it, which were also test junk.

### Stage 6: Docker and production stack (2026-11-16), COMPLETE

**Files:**
- `backend/Dockerfile` (rewritten): runs as non-root user `app` (uid 10001), no compiler packages, `collectstatic` at build with the production (hashed) storage, gunicorn (`GUNICORN_WORKERS`, `GUNICORN_TIMEOUT`), HTTP health check. `gunicorn==23.0.0` added to `requirements.txt`.
- `backend/.dockerignore`, `frontend/.dockerignore` (new): keep `.env`, `db.sqlite3`, `media/`, `venv/`, `node_modules/`, `.next/`, `.git` out of images (AUD-03). Verified inside the built image: no `.env`, database, venv or media.
- `frontend/Dockerfile` (new, AUD-04): three stages (deps, build, runtime), Next.js `output: "standalone"` (added to `next.config.ts`; `next dev` unaffected), runs as `node`, health check. `NEXT_PUBLIC_API_BASE_URL` is a required build arg.
- `docker-compose.yml` (rewritten, AUD-02/05/15/16): production stack. Every secret is required (`${VAR:?}`); no hard-coded credentials. Postgres and Redis are on a `data` network with no outbound route and no published ports; Redis requires a password and keeps AOF data on a volume. One-off `migrate` service runs migrations and seeds once; backend, worker and beat wait for it to finish successfully and for Redis to be healthy; nginx waits for healthy backend and frontend. Health checks on db, redis, backend, worker, frontend, nginx. No source bind mounts, no `runserver`/`npm run dev`.
- `deploy/nginx/templates/default.conf.template` (new): `APP_DOMAIN` → frontend, `API_DOMAIN` → API/admin/static, `/media/` served read-only from the media volume with `nosniff` and a sandbox CSP; unknown hosts get the connection closed; 12 MB body limit; forwards `X-Forwarded-For` and `X-Forwarded-Proto` (from the TLS front end when present).
- `.env.production.example` (new; `.gitignore` now allows it): every variable compose needs, with generation instructions.
- `README.md`, `backend/README.md`: Docker section updated (the old `docker compose up --build` dev command no longer applies).

**Verification** (separate compose project `nexainvite-stage6-test`, fresh volumes, random secrets, `https://localhost` / `https://api.localhost` with curl sending `X-Forwarded-Proto: https`; torn down with its volumes afterwards; the pre-existing Docker volume was not touched):

| Check | Result | Notes |
| --- | --- | --- |
| `docker compose config` | PASSED | |
| Build both images | PASSED | backend 292 MB, frontend 219 MB |
| No secrets/data in images, non-root users | PASSED | uid 10001 (backend, worker), 1000 (frontend) |
| `up --wait`: all services healthy, `migrate` exits 0 | PASSED | First attempt with `http://` origins was correctly refused by the production settings |
| `/api/v1/health/`, `/health/ready/` (db, cache, broker) | PASSED | all `ok` |
| API, admin, static (WhiteNoise), frontend pages via nginx | PASSED | 200 |
| HTTP → HTTPS redirect, unknown Host closed, security headers, CORS allow/deny | PASSED | HSTS off only because the test set it to 0 |
| Register, login, `/users/me`, logout, refresh after logout = 401 | PASSED | |
| Image upload, served by nginx from the shared volume with sandbox CSP; absolute `https://` URL | PASSED | |
| Login rate limit via Redis across gunicorn workers | PASSED | 429 returned |
| Celery task round-trip through the worker | PASSED | |
| Postgres not reachable from host; db has no outbound access; backend can reach smtp.gmail.com:587 | PASSED | |
| Redis rejects commands without the password | PASSED | `NOAUTH` |
| Data survives `down` + `up`; seeds re-run without duplicates | PASSED | |
| Real TLS, real domain, real SMTP/Razorpay from containers | NOT TESTED | Needs the server and DNS |
| Moving the existing SQLite data into Postgres | NOT DONE | Not part of this stage; a production deploy starts with an empty database unless data is migrated (plan in Stage 7) |

**Notes and limitations:**
- TLS is not terminated inside the stack. A load balancer or host proxy (e.g. Caddy/certbot) must sit in front and set `X-Forwarded-Proto`; then `NUM_PROXIES=2`. If nginx itself is ever exposed directly, `NUM_PROXIES=1`, and it must not be exposed without TLS.
- `NEXT_PUBLIC_API_BASE_URL` is compiled into the frontend; changing `API_URL` means rebuilding the frontend image.
- Celery beat keeps its schedule state in `/tmp` inside its container; a restart only means it recalculates the next run times.
- Postgres and media backups come in Stage 7.

**Rollback:** `git checkout docker-compose.yml backend/Dockerfile frontend/next.config.ts backend/requirements.txt README.md backend/README.md .gitignore`; delete `backend/.dockerignore`, `frontend/.dockerignore`, `frontend/Dockerfile`, `deploy/`, `.env.production.example`. Nothing in the local SQLite database or media changed.

### Stage 7: Render deployment, backups, ops docs (2026-11-16), COMPLETE

**Owner decisions (2026-11-16):** host on **Render**; production **starts fresh on Postgres** (no SQLite data migration); uploaded images on a **Render persistent disk** (not S3/R2).

**Render facts this is built on** (from Render's docs, 2026-11-16): Free plan has no background workers, blocks outbound port 587, and deletes Postgres after 30 days, so paid plans are required. A disk attaches to one service only, forces a single instance and a few seconds of downtime per deploy, and is snapshotted daily (7 days). Render terminates TLS and passes service env vars to Docker builds as build args. Key Value internal URLs are unauthenticated by default. Render does not document its proxy hop count.

**Changes:**
- `render.yaml` (new): Blueprint for API (Docker, 1 GB disk at `/var/data`, health check, migrations and seeds as `preDeployCommand`), Celery worker with embedded beat (`-B`, pinned to 1 instance), frontend, Postgres 16 and Key Value (`noeviction`, internal only), all in `singapore`, smallest paid plan IDs. Secrets are `sync: false` on the API and copied to the worker with `fromService`. **Validated against Render's published JSON schema: 0 errors.**
- `config/settings.py`: `DATABASE_URL` support (no new dependency; percent-encoded passwords and `?sslmode=` handled), persistent DB connections with health checks, production refuses SQLite, `MEDIA_ROOT` from env, `SERVE_MEDIA` flag, Render's `RENDER_EXTERNAL_HOSTNAME` added to `ALLOWED_HOSTS` automatically.
- `config/media.py` + `config/urls.py`: Django serves `/media/` when `SERVE_MEDIA=True` (Render has no nginx), with `nosniff` and a sandbox CSP; path traversal and directory listings refused.
- `admin_portal`: staff-only `GET /api/v1/admin/request-info/` to confirm `NUM_PROXIES` after the first deploy.
- `backend/Dockerfile` + `backend/docker-entrypoint.sh`: binds `$PORT` (Render: 10000); starts as root only to make a root-owned disk's media folder writable, then drops to uid 10001 with `setpriv`.
- `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh` (new): custom-format dump with validity check; restore refuses a non-empty target. Use Docker if a matching local client isn't installed.
- `docs/DEPLOY-RENDER.md` (new): plans, values to enter, admin account, post-deploy checks, `NUM_PROXIES` procedure, custom domains, backups and restore, rollback and migrations, Twilio switch-on, troubleshooting. Linked from `README.md`.
- `.gitignore`: `backups/` and `*.dump` ignored.
- Tests: `config/tests_render.py` (8 tests); production-settings fixture now includes `DATABASE_URL`, plus a test that production refuses SQLite.

| Check | Result | Notes |
| --- | --- | --- |
| Backend tests | PASSED | 170 tests |
| `render.yaml` vs Render JSON schema | PASSED | 0 errors |
| Render simulation in Docker: pre-deploy migrate+seed with no disk, `DATABASE_URL`, unauthenticated Redis, `PORT=10000`, root-owned disk at `/var/data` | PASSED | readiness: database, cache, broker ok |
| gunicorn and celery run as uid 10001; media folder chowned to `app` | PASSED | |
| Register, login, upload, image served by Django with nosniff + sandbox CSP, `https://` URLs | PASSED | |
| `*.onrender.com` host accepted; plain HTTP redirected to HTTPS | PASSED | |
| `request-info` staff-only and reports the forwarding chain | PASSED | |
| Celery round trip with worker running `-B` | PASSED | |
| Uploaded file still served after replacing the API container | PASSED | |
| Frontend on `PORT=10000`, API URL compiled in | PASSED | |
| Backup → restore into a separate empty Postgres; counts identical (users 3, templates 20, plans 3, 52 migrations); second restore refused | PASSED | |
| Real Render deploy, real `NUM_PROXIES`, real disk permissions, email/Razorpay from Render | NOT TESTED | Needs the Render account; steps in the guide |
| Self-hosted compose stack re-run after the entrypoint change | NOT RE-RUN | Same image and entrypoint as tested standalone; `compose config` unchanged |

All simulation containers, networks and volumes were removed; the pre-existing Docker volume was not touched.

**Known limitations:** `NUM_PROXIES` defaults to 1 until checked on Render; API is single-instance with brief downtime per deploy (disk); worker must stay at 1 instance (embedded beat); `fromService` copies reach the worker only on its next deploy.

**Rollback:** revert `config/settings.py`, `config/urls.py`, `admin_portal/views.py`, `admin_portal/urls.py`, `config/tests.py`, `backend/Dockerfile`, `README.md`, `.gitignore`; delete `render.yaml`, `config/media.py`, `config/tests_render.py`, `backend/docker-entrypoint.sh`, `scripts/`, `docs/DEPLOY-RENDER.md`. No migrations.
