#!/bin/sh
set -eu
admin_email="${1:-}"
if [ -z "$admin_email" ]; then echo "Usage: ./scripts/prepare-proxmox.sh admin@example.com" >&2; exit 1; fi
if [ -e .env.production ] || [ -e secrets/postgres_owner_password ]; then echo "Deployment secrets already exist. Nothing changed." >&2; exit 1; fi
mkdir -p secrets backups
chmod 700 secrets backups
openssl rand -hex 32 > secrets/postgres_owner_password
openssl rand -hex 32 > secrets/postgres_app_password
openssl rand -hex 32 > secrets/postgres_backup_password
chmod 600 secrets/postgres_owner_password secrets/postgres_app_password secrets/postgres_backup_password
auth_secret="$(openssl rand -base64 48 | tr -d '\n')"
encryption_key="$(openssl rand -base64 32 | tr -d '\n')"
sed -e "s|replace-with-at-least-32-random-characters|$auth_secret|" -e "s|platform-admin@example.com|$admin_email|" -e "s|^INTEGRATION_ENCRYPTION_KEY=.*|INTEGRATION_ENCRYPTION_KEY=$encryption_key|" .env.production.example > .env.production
chmod 600 .env.production
echo "Created .env.production and local deployment secrets. Add provider credentials directly to .env.production before enabling integrations."
