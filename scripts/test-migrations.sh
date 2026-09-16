#!/usr/bin/env bash
# Apply every migration to a scratch Postgres database, then run the SQL
# behaviour tests in supabase/tests/*.test.sql.
#
# Why: the vitest suite cannot exercise RPC guards, RLS visibility for the anon
# role, or grant revokes. These run the real SQL against a real server.
#
# Needs a reachable Postgres 15+ you can create databases on. Nothing is written
# to your Supabase project. Defaults suit a local server with trust auth:
#
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres scripts/test-migrations.sh
#
# To use a throwaway cluster instead of an installed service:
#   initdb -D /tmp/kl-pg -U postgres --auth=trust
#   pg_ctl -D /tmp/kl-pg -o "-p 54329" start
#   PGPORT=54329 scripts/test-migrations.sh
#
# The database named by $KL_TEST_DB (default: kaffeelisten_migration_test) is
# DROPPED and recreated on every run.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${KL_TEST_DB:-kaffeelisten_migration_test}"
PSQL=(psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -d postgres -c "drop database if exists \"$DB\"" -c "create database \"$DB\"" >/dev/null

echo "── bootstrap"
"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/tests/00_supabase_bootstrap.sql" >/dev/null

echo "── migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  if ! out=$("${PSQL[@]}" -d "$DB" -f "$f" 2>&1); then
    echo "FAILED  $(basename "$f")"
    echo "$out" | grep -v NOTICE | tail -10
    exit 1
  fi
  echo "ok      $(basename "$f")"
done

echo "── behaviour tests"
status=0
for t in "$ROOT"/supabase/tests/*.test.sql; do
  echo "   $(basename "$t")"
  if ! out=$("${PSQL[@]}" -d "$DB" -f "$t" 2>&1); then
    echo "$out" | sed -E 's/^psql:[^ ]+ //'
    status=1
  else
    echo "$out" | grep -oE 'ok  .*' | sed 's/^/     /'
  fi
done

exit $status
