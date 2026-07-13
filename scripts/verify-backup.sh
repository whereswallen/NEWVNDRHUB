#!/bin/sh
set -eu

file="${1:?Usage: verify-backup.sh backups/file.dump.age}"
identity="${AGE_IDENTITY_FILE:?Set AGE_IDENTITY_FILE to the offline private key path}"
test -f "${file}.sha256" || { echo "Missing checksum" >&2; exit 1; }
sha256sum -c "${file}.sha256"
temporary="$(mktemp)"
trap 'rm -f "$temporary"' EXIT HUP INT TERM
age -d -i "$identity" -o "$temporary" "$file"
pg_restore --list "$temporary" >/dev/null
echo "Backup integrity and PostgreSQL archive structure verified."
