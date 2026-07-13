#!/bin/sh
set -eu
mkdir -p backups
file="backups/vndrhub-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose -f docker-compose.production.yml exec -T postgres pg_dump --format=custom --no-owner --no-acl -U vndrhub vndrhub > "$file"
test -s "$file" || { rm -f "$file"; echo "Backup failed" >&2; exit 1; }
find backups -type f -name 'vndrhub-*.dump' -mtime +30 -delete
echo "$file"
