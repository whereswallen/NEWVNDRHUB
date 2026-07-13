#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
destination="${BACKUP_DIRECTORY:-./backups}"
mkdir -p "$destination"
file="$destination/vndrhub-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > "$file"
echo "$file"
