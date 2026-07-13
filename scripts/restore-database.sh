#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${1:?Pass the backup dump path}"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$1"
