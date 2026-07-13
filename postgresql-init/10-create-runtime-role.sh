#!/bin/sh
set -eu
: "${POSTGRES_APP_PASSWORD_FILE:?POSTGRES_APP_PASSWORD_FILE is required}"
: "${POSTGRES_BACKUP_PASSWORD_FILE:?POSTGRES_BACKUP_PASSWORD_FILE is required}"
app_password="$(cat "$POSTGRES_APP_PASSWORD_FILE")"
backup_password="$(cat "$POSTGRES_BACKUP_PASSWORD_FILE")"
escaped_password="$(printf %s "$app_password" | sed "s/'/''/g")"
escaped_backup_password="$(printf %s "$backup_password" | sed "s/'/''/g")"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vndrhub_app') THEN
    CREATE ROLE vndrhub_app LOGIN PASSWORD '${escaped_password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END \$\$;
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vndrhub_backup') THEN
    CREATE ROLE vndrhub_backup LOGIN PASSWORD '${escaped_backup_password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END \$\$;
GRANT pg_read_all_data TO vndrhub_backup;
SQL
