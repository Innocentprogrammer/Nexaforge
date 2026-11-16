# Deploying NexaInvite on Render

This guide takes NexaInvite from the Git repo to a running production site on
[Render](https://render.com), starting with an empty Postgres database. Everything
Render needs is in [`render.yaml`](../render.yaml) (a Render "Blueprint").

> The repo-root `docker-compose.yml` is a separate option for hosting on your own
> server. Render does not use it.

## What gets created

| Render resource | Name | What it runs |
| --- | --- | --- |
| Web service (Docker) | `nexainvite-api` | Django API on gunicorn, Django admin, uploaded images (1 GB disk at `/var/data`) |
| Background worker (Docker) | `nexainvite-worker` | Celery worker + scheduled jobs (beat) |
| Web service (Docker) | `nexainvite-web` | Next.js frontend |
| Postgres | `nexainvite-db` | Database, no public access |
| Key Value | `nexainvite-redis` | Celery queue and rate-limit counters, internal only |

All in the **Singapore** region (closest to India). The region can't be changed
after creation.

### Plans and cost

**The Free plan does not work for this app.** On Free, background workers don't
exist, outgoing email on port 587 is blocked, and the database is deleted after
30 days with no backups. `render.yaml` uses the smallest paid plans: `0.5c-512mb`
for the three services, `0.1c-256mb` for Postgres and `256mb` for Key Value, plus
a 1 GB disk. Check current prices on Render's pricing page before you apply.

### Limits that come with the disk

- The API runs as **one instance** (Render doesn't allow scaling a service with a disk).
- Each API deploy has **a few seconds of downtime**: Render stops the old instance
  before starting the new one.
- If the app outgrows this, move uploads to cloud storage (S3/R2). Only the API
  touches uploaded files, so nothing else changes.

## 1. Before you start

1. **Commit and push** the code to GitHub or GitLab. Render deploys from the repo,
   not from your computer.
2. Have ready:
   - Gmail address and app password (16 characters, no spaces or hyphens).
   - Razorpay keys (test keys `rzp_test_...` until payments are signed off) and webhook secret.
   - Your domain names, e.g. `nexainvite.com` and `api.nexainvite.com`. You can start
     on the `*.onrender.com` names and add the domains later.
3. Generate the Django secret key (it must be 50+ characters, so Render's
   "Generate" button is too short):

   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

## 2. Apply the Blueprint

Render Dashboard → **New** → **Blueprint** → choose the repo → Render reads
`render.yaml` and asks for every value marked `sync: false`.

Values for **`nexainvite-api`**. The worker copies these automatically, so you
enter them once.

| Key | Value |
| --- | --- |
| `SECRET_KEY` | the key from step 1.3 |
| `ALLOWED_HOSTS` | `api.nexainvite.com` (first deploy without a domain: `nexainvite-api.onrender.com`) |
| `CORS_ALLOWED_ORIGINS` | `https://nexainvite.com` (first deploy: `https://nexainvite-web.onrender.com`) |
| `CSRF_TRUSTED_ORIGINS` | `https://nexainvite.com,https://api.nexainvite.com` (first deploy: both onrender URLs) |
| `FRONTEND_URL` | `https://nexainvite.com` (used in email links) |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_HOST_USER` | your Gmail address |
| `EMAIL_HOST_PASSWORD` | the Gmail app password |
| `DEFAULT_FROM_EMAIL` | `NexaInvite <your-gmail@gmail.com>` (Gmail rewrites other From addresses) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | from the Razorpay dashboard |
| `ADMINS` | optional: `Your Name <you@example.com>` to get server-error emails |
| `SENTRY_DSN` | optional |
| `NEXAINVITE_TWILIO_*` | leave empty until WhatsApp/SMS sending is switched on |

Values for **`nexainvite-web`**:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.nexainvite.com/api/v1` (first deploy: `https://nexainvite-api.onrender.com/api/v1`) |

> If Render adds a suffix to a service name because the name is taken (e.g.
> `nexainvite-api-x1y2.onrender.com`), use the actual URL shown in the Dashboard.

Click **Apply**. The first deploy builds both images; the API runs migrations and
loads the template catalogue and plans (`preDeployCommand`) before going live.

## 3. Create your admin account

`nexainvite-api` → **Shell**:

```bash
python manage.py createsuperuser
```

It asks for email, username (use the email again) and password. This account can
use the Django admin (`https://api.../admin/`) and the in-app admin portal.

## 4. Check the deploy

| Check | How | Expected |
| --- | --- | --- |
| API alive | open `https://api.../api/v1/health/ready/` | `"database": "ok", "cache": "ok", "broker": "ok"` |
| Frontend | open `https://nexainvite.com` | home page loads |
| Client IP / `NUM_PROXIES` | run the two commands below | `resolved_client_ip` equals your real IP (search "what is my IP") |
| Register, log in, log out | in the app | works; after logout, Back doesn't log you in again |
| Image upload | upload a picture in the editor | shows in the editor and on the public invitation |
| Email | "Forgot password" for your account | email arrives (check the worker's logs if not) |
| Payments | Razorpay dashboard → Webhooks → add `https://api.../api/v1/payments/webhook/razorpay/` with the webhook secret | test payment activates the plan |

**Setting `NUM_PROXIES` correctly.** Rate limits and the activity log use the
client IP. Render doesn't document how many proxies it puts in front of an app,
so check it once:

```bash
TOKEN=$(curl -s -H "Content-Type: application/json" \
  -d '{"email":"ADMIN_EMAIL","password":"ADMIN_PASSWORD"}' \
  https://api.nexainvite.com/api/v1/auth/login/ | python3 -c "import sys,json;print(json.load(sys.stdin)['access'])")
curl -s -H "Authorization: Bearer $TOKEN" https://api.nexainvite.com/api/v1/admin/request-info/
```

If `resolved_client_ip` isn't your IP, find your IP in `x_forwarded_for`, count
its position from the **right** (rightmost = 1), set `NUM_PROXIES` to that number
on `nexainvite-api`, and redeploy. If your IP isn't in the list at all, keep `1`
and tell the developer.

## 5. Custom domains

1. `nexainvite-web` → Settings → Custom Domains → add `nexainvite.com` (and `www` if wanted).
2. `nexainvite-api` → Settings → Custom Domains → add `api.nexainvite.com`.
3. Create the DNS records Render shows at your domain registrar. Render issues the
   HTTPS certificates itself.
4. Update the env values from section 2 to the real domains
   (`ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_URL`,
   `NEXT_PUBLIC_API_BASE_URL`).
5. Redeploy **all three** services. The frontend must be rebuilt, because the API URL
   is compiled into it. The worker picks up copied values only on its next deploy.

After everything works on HTTPS for a while, you can raise `SECURE_HSTS_SECONDS`
(e.g. to `31536000`, one year). Browsers then refuse plain HTTP for that long, so
only do this once you're sure.

## 6. Backups

| What | Built in (paid plans) | Extra copy you control |
| --- | --- | --- |
| Database | Point-in-time recovery: 3 days (Hobby workspace) or 7 days (Pro). Restoring creates a **new** database; you then point the services at it. Also manual exports from the database's **Recovery** page (kept 7 days). | `scripts/backup-postgres.sh` (below) |
| Uploaded images | Disk snapshot every 24 h, kept 7 days. Restoring replaces the whole disk. | Download a Recovery export, or copy files off the disk with Render's SSH/scp feature (see Render's "Disks" docs) |

**Manual database backup to your computer.** The database has no public access
(`ipAllowList: []`). To dump it from your computer, temporarily add your IP under
`nexainvite-db` → **Networking**, copy the **External Database URL**, then:

```bash
export PROD_DATABASE_URL='postgresql://...external URL...'
scripts/backup-postgres.sh "$PROD_DATABASE_URL" ./backups
```

Remove your IP from the allow list afterwards. Dumps contain user data: keep them
somewhere safe (`backups/` and `*.dump` are git-ignored).

**Restore a dump** into a new, empty database (never over the live one; the
script refuses if the target already has NexaInvite tables):

```bash
scripts/restore-postgres.sh backups/nexainvite-YYYYMMDDTHHMMSSZ.dump "$NEW_DATABASE_URL"
```

Both scripts use a local `pg_dump`/`psql` 16 if installed, otherwise Docker.

## 7. Deploying updates and rolling back

- **Deploy:** push to the branch Render watches. Each service rebuilds; the API
  runs migrations before the new version goes live. If a migration fails, the
  deploy stops and the old version keeps running.
- **Roll back code:** service → **Deploys** → pick the last good deploy → **Rollback**.
  This does **not** undo database migrations. Most migrations only add things and
  are safe to leave. If one changed or deleted data, use point-in-time recovery
  (restore to just before the deploy), then point `DATABASE_URL` at the new database.
- **Before risky releases:** take a manual export (Recovery page) or run
  `scripts/backup-postgres.sh` first.

## 8. Switching on WhatsApp/SMS invites

On `nexainvite-api`, fill in the `NEXAINVITE_TWILIO_*` values and change
`INVITE_SEND_BACKEND` from `console` to `twilio`, then redeploy the API
**and** the worker (the worker copies these values and is the one that sends).

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Deploy fails with `ImproperlyConfigured: ...` | A required production value is missing or weak; the message names it (e.g. `SECRET_KEY` under 50 characters, `http://` in `CORS_ALLOWED_ORIGINS`). |
| `400 Bad Request` from the API | The domain isn't in `ALLOWED_HOSTS`. |
| Browser console shows a CORS error | The frontend's exact origin (`https://...`, no trailing slash) isn't in `CORS_ALLOWED_ORIGINS`. |
| Frontend calls the wrong API URL | `NEXT_PUBLIC_API_BASE_URL` changed without a frontend redeploy. |
| Emails not arriving | Check `nexainvite-worker` logs. Gmail needs an app password; a malformed one shows as `SMTPServerDisconnected`. |
| Scheduled jobs (plan expiry, reminders) run twice | The worker was scaled above 1 instance. Keep it at 1. |
