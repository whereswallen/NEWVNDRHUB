#!/bin/sh
set -eu
if [ -z "${DATABASE_URL:-}" ]; then
  : "${DATABASE_PASSWORD_FILE:?DATABASE_PASSWORD_FILE is required when DATABASE_URL is unset}"
  password="$(node -e 'process.stdout.write(encodeURIComponent(require("fs").readFileSync(process.argv[1],"utf8").trim()))' "$DATABASE_PASSWORD_FILE")"
  export DATABASE_URL="postgres://${DATABASE_USER:-vndrhub}:$password@${DATABASE_HOST:-postgres}:5432/${DATABASE_NAME:-vndrhub}"
fi
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Applying database migrations..."
  npm run db:migrate
fi
if [ "${MIGRATE_ONLY:-false}" = "true" ]; then
  exit 0
fi
echo "Starting VNDR Hub..."
exec npm start
