#!/bin/sh
set -eu
file="${1:-}"
test -n "$file" && test -f "$file" || { echo "Usage: ./scripts/restore-production.sh decrypted-file.dump" >&2; exit 1; }
echo "This replaces the current VNDR Hub database. Type RESTORE to continue:"
read confirmation
[ "$confirmation" = "RESTORE" ] || exit 1
docker compose -f docker-compose.production.yml stop app
docker compose -f docker-compose.production.yml exec -T postgres pg_restore --clean --if-exists --no-owner --no-acl -U vndrhub_owner -d vndrhub < "$file"
docker compose -f docker-compose.production.yml start app
