#!/usr/bin/env bash
# Rebuild the STAGING database from supabase/migrations and load the local seed.
# Destroys all staging data. Refuses to touch the production project.
#
#   STAGING_DB_URL=postgresql://... bash scripts/db/staging-reset.sh [seed.sql]
set -euo pipefail
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
: "${STAGING_DB_URL:?Set STAGING_DB_URL}"
SEED="${1:-$ROOT/supabase/seeds/staging_roster.local.sql}"
PROD_REF="fdnfdscpefxqvtggbbbr"

if [[ "$STAGING_DB_URL" == *"$PROD_REF"* ]]; then
  echo "Refusing: STAGING_DB_URL points at the production project." >&2
  exit 1
fi

supabase db reset --db-url "$STAGING_DB_URL" --no-seed
if [ -f "$SEED" ]; then
  psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -q -X -f "$SEED"
  echo "staging rebuilt and seeded from $(basename "$SEED")"
else
  echo "staging rebuilt (no seed file at $SEED)"
fi
