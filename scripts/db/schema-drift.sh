#!/usr/bin/env bash
# Compare the schema of a live database with one built from supabase/migrations.
# Read-only against the target. Exit 0 when identical, 1 when they differ.
#
#   TARGET_DB_URL=postgresql://... PGPORT=54329 bash scripts/db/schema-drift.sh [up-to-migration]
#
# The reference database is built on the local/CI Postgres named by the PG*
# variables (as in scripts/test-migrations.sh). Pass a migration number such as
# 029 to build the reference only up to that file (production baseline check).
set -euo pipefail
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
: "${TARGET_DB_URL:?Set TARGET_DB_URL to the database to check}"
UPTO="${1:-999}"
REF_DB="kaffeelisten_drift_reference"
PSQL=(psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -v ON_ERROR_STOP=1 -q -X)
OUT="$(mktemp -d)"

"${PSQL[@]}" -d postgres -c "drop database if exists $REF_DB" -c "create database $REF_DB" >/dev/null
"${PSQL[@]}" -d "$REF_DB" -f "$ROOT/supabase/tests/00_supabase_bootstrap.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do
  n=$(basename "$f" | cut -d_ -f1)
  if [ "$((10#$n))" -le "$((10#$UPTO))" ]; then
    "${PSQL[@]}" -d "$REF_DB" -f "$f" >/dev/null
  fi
done

"${PSQL[@]}" -d "$REF_DB" -f "$ROOT/scripts/db/schema-fingerprint.sql" > "$OUT/reference.txt"
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -q -X -f "$ROOT/scripts/db/schema-fingerprint.sql" > "$OUT/target.txt"

if diff -u "$OUT/reference.txt" "$OUT/target.txt" > "$OUT/drift.diff"; then
  echo "no schema drift (reference: migrations up to $UPTO)"
else
  echo "SCHEMA DRIFT: '-' lines exist only in migrations, '+' lines only in the target"
  cat "$OUT/drift.diff"
  exit 1
fi
