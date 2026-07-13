#!/bin/sh
set -eu

: "${STAGING_APP_URL:?Set STAGING_APP_URL, for example https://staging.vndrhub.ca}"
: "${AGE_IDENTITY_FILE:?Set AGE_IDENTITY_FILE for backup verification}"
: "${DATABASE_URL:?Set DATABASE_URL using the vndrhub_app role}"

docker compose -f docker-compose.production.yml ps
curl --fail --silent --show-error "$STAGING_APP_URL/api/health/live" >/dev/null
curl --fail --silent --show-error "$STAGING_APP_URL/api/health/ready" >/dev/null

latest="$(find backups -type f -name 'vndrhub-*.dump.age' -print | sort | tail -1)"
test -n "$latest" || { echo "No encrypted backup found" >&2; exit 1; }
./scripts/verify-backup.sh "$latest"

SECURITY_ENFORCE_RLS=true node scripts/verify-rls.mjs
echo "Staging security verification passed. Record this result before production approval."
