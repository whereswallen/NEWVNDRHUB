#!/bin/sh
set -eu

: "${AGE_RECIPIENT:?Set AGE_RECIPIENT to the offline backup public key}"
command -v age >/dev/null || { echo "age is required" >&2; exit 1; }

umask 077
mkdir -p backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
encrypted="backups/vndrhub-${stamp}.dump.age"
checksum="${encrypted}.sha256"
temporary="$(mktemp)"
trap 'rm -f "$temporary"' EXIT HUP INT TERM

docker compose -f docker-compose.production.yml exec -T postgres sh -ec \
  'PGPASSWORD="$(cat /run/secrets/postgres_backup_password)" pg_dump --format=custom --no-owner --no-acl -U vndrhub_backup vndrhub' > "$temporary"
test -s "$temporary" || { echo "Backup failed" >&2; exit 1; }
age -r "$AGE_RECIPIENT" -o "$encrypted" "$temporary"
sha256sum "$encrypted" > "$checksum"

if [ -n "${RESTIC_REPOSITORY:-}" ]; then
  command -v restic >/dev/null || { echo "restic is configured but unavailable" >&2; exit 1; }
  : "${RESTIC_PASSWORD_FILE:?Set RESTIC_PASSWORD_FILE for off-site backups}"
  restic backup "$encrypted" "$checksum"
  restic forget --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
fi

find backups -type f \( -name 'vndrhub-*.dump.age' -o -name 'vndrhub-*.dump.age.sha256' \) -mtime +30 -delete
echo "$encrypted"
