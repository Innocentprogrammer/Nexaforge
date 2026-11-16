#!/usr/bin/env bash
# Restore a dump made by backup-postgres.sh into an EMPTY database.
#
#   scripts/restore-postgres.sh backups/nexainvite-....dump "postgresql://user:pass@host:5432/newdb"
#
# Refuses to run if the target already has NexaInvite tables, so it cannot
# overwrite live data by accident. Restore into a new database, check it, then
# point the app at it.
set -euo pipefail

FILE="${1:?usage: restore-postgres.sh DUMP_FILE TARGET_DATABASE_URL}"
URL="${2:?usage: restore-postgres.sh DUMP_FILE TARGET_DATABASE_URL}"
PG_IMAGE="${PG_IMAGE:-postgres:16-alpine}"
[ -f "$FILE" ] || { echo "No such file: $FILE" >&2; exit 1; }

run_pg() {  # run a postgres client command, locally if v16 is installed, else in Docker
    if command -v psql >/dev/null 2>&1 && psql --version | grep -q " 16\."; then
        "$@"
    else
        docker run --rm -i --network host "$PG_IMAGE" "$@"
    fi
}

existing=$(run_pg psql "$URL" -tAc "select count(*) from information_schema.tables where table_name = 'django_migrations'")
if [ "$existing" != "0" ]; then
    echo "Refusing to restore: target database already has NexaInvite tables." >&2
    exit 1
fi

run_pg pg_restore --no-owner --no-privileges --exit-on-error --dbname="$URL" < "$FILE"
echo "Restored $FILE"
run_pg psql "$URL" -tAc "select 'users: ' || count(*) from accounts_user union all select 'invitations: ' || count(*) from invitations_invitation union all select 'migrations: ' || count(*) from django_migrations"
