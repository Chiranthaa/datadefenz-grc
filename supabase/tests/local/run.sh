#!/usr/bin/env bash
# Applies the Supabase stand-ins, all migrations and the RLS isolation tests
# to a throwaway local PostgreSQL cluster. Needs PostgreSQL 15+ binaries
# (initdb, pg_ctl, psql) on PATH or in PG_BIN. Uses no credentials and never
# touches a Supabase project.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/pg_ctl | sort -V | tail -1)")}"
PORT="${PGTEST_PORT:-54329}"
WORK="$(mktemp -d)"
trap '"$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

"$PG_BIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null

PSQL=("$PG_BIN/psql" -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$ROOT/supabase/tests/local/00_supabase_stubs.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "Applying $(basename "$migration")"
  "${PSQL[@]}" -f "$migration"
done
"${PSQL[@]}" -f "$ROOT/supabase/tests/local/10_rls_isolation_test.sql"
echo "All RLS isolation tests passed."
