#!/bin/sh
set -eu
test -f .env.production || { echo "Run scripts/prepare-proxmox.sh first." >&2; exit 1; }
docker compose -f docker-compose.production.yml build --pull
docker compose -f docker-compose.production.yml run --rm --no-deps --entrypoint node app scripts/check-production-env.mjs
docker compose -f docker-compose.production.yml up -d --remove-orphans
app_domain="$(sed -n 's/^APP_DOMAIN=//p' .env.production | tail -1)"
app_domain="${app_domain:-app.vndrhub.ca}"
attempt=0
until curl --fail --silent --show-error "https://${app_domain}/api/health/ready" >/dev/null; do attempt=$((attempt+1)); [ "$attempt" -lt 30 ] || { docker compose -f docker-compose.production.yml ps; exit 1; }; sleep 5; done
docker compose -f docker-compose.production.yml ps
echo "VNDR Hub is ready at https://${app_domain}"
