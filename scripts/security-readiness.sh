#!/bin/sh
set -eu

test "${NODE_ENV:-}" = "production" || { echo "NODE_ENV must be production" >&2; exit 1; }
test "${REQUIRE_PLATFORM_ADMIN_MFA:-false}" = "true" || { echo "Platform MFA is not enforced" >&2; exit 1; }
test -n "${AGE_RECIPIENT:-}" || { echo "AGE_RECIPIENT is required for encrypted backups" >&2; exit 1; }
test -n "${RESTIC_REPOSITORY:-}" || { echo "RESTIC_REPOSITORY is required for off-site backups" >&2; exit 1; }
test -n "${SECURITY_ENFORCE_RLS:-}" || { echo "RLS enforcement has not been explicitly enabled" >&2; exit 1; }
test -f secrets/postgres_owner_password
test -f secrets/postgres_app_password
test -f secrets/postgres_backup_password
echo "Security deployment prerequisites are present."
