#!/bin/sh
# Make the media folder writable by the app user, then run the command as that
# user. Hosted disks (e.g. Render) are often mounted owned by root, so the
# container starts as root only long enough to fix that one directory.
set -e
MEDIA_DIR="${MEDIA_ROOT:-/app/media}"
if [ "$(id -u)" = "0" ]; then
    mkdir -p "$MEDIA_DIR"
    # Only the top folder: everything below it is created by the app user.
    chown app:app "$MEDIA_DIR"
    exec setpriv --reuid=app --regid=app --init-groups "$@"
fi
exec "$@"
