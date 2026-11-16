#!/usr/bin/env bash
# Dump a NexaInvite Postgres database to a local file (pg_dump custom format).
#
#   scripts/backup-postgres.sh "postgresql://user:pass@host:5432/db" [output-dir]
#
# Uses a local pg_dump if it matches the server's major version, otherwise runs
# pg_dump from the postgres:16-alpine Docker image. Never writes to the database.
# The URL holds a password: pass it from an env var, e.g. "$PROD_DATABASE_URL",
# so it doesn't land in your shell history.
set -euo pipefail

URL="${1:?usage: backup-postgres.sh DATABASE_URL [output-dir]}"
OUT_DIR="${2:-./backups}"
PG_IMAGE="${PG_IMAGE:-postgres:16-alpine}"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/nexainvite-$(date -u +%Y%m%dT%H%M%SZ).dump"

if command -v pg_dump >/dev/null 2>&1 && pg_dump --version | grep -q " 16\."; then
    pg_dump --format=custom --no-owner --no-privileges --dbname="$URL" --file="$FILE"
else
    docker run --rm --network host -e DUMP_URL="$URL" "$PG_IMAGE" \
        sh -c 'pg_dump --format=custom --no-owner --no-privileges --dbname="$DUMP_URL"' > "$FILE"
fi

# A custom-format dump starts with "PGDMP"; refuse to report success otherwise.
if [ "$(head -c 5 "$FILE")" != "PGDMP" ]; then
    echo "Backup FAILED: $FILE is not a valid dump" >&2
    exit 1
fi
echo "Backup written: $FILE ($(du -h "$FILE" | cut -f1))"
