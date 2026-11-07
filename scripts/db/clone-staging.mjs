#!/usr/bin/env node
// Copy staging's DATA into the local stack, so local runs on something that
// looks like the real thing instead of ten seeded rows.
//
//   node scripts/db/clone-staging.mjs            write the snapshot and load it
//   node scripts/db/clone-staging.mjs --dump-only write it, do not load
//
// Schema comes from migrations, never from here. This moves rows only.
//
// The snapshot lands in supabase/seeds/*.local.sql, which is gitignored: it is
// a copy of a live roster and must not reach a repository. Staging's addresses
// are .example today, but that is a fact about today, not a guarantee.
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const PROJECT_REF = process.env.STAGING_PROJECT_REF || 'opqyzcdwboxlugllgzxf'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const OUT = 'supabase/seeds/staging_snapshot.local.sql'
const CONTAINER = 'supabase_db_kaffeelisten'

// Order matters: parents before children, so foreign keys hold on load.
const TABLES = [
  'companies', 'members', 'items',
  'app_settings', 'app_theme',
  'transactions', 'transactions_archive',
  'member_payments', 'company_payments',
  'billing_runs', 'billing_documents',
  'report_runs', 'document_deliveries', 'email_delivery_events',
]

if (!TOKEN) {
  console.error('\n  SUPABASE_ACCESS_TOKEN is not set.')
  console.error('  It lives in the umbrella .env.local; this script only reads staging.\n')
  process.exit(1)
}
if (PROJECT_REF === 'fdnfdscpefxqvtggbbbr') {
  console.error('\n  Refusing: that is the PRODUCTION project. This clones staging only.\n')
  process.exit(1)
}

async function query(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`

// The Management API returns JSON, so a Postgres text[] arrives as a JS array
// and so does a jsonb array - identical in JSON, different in SQL. Without the
// column type, text[] gets written as '["a"]' and Postgres rejects it with
// "malformed array literal". So types are read first and drive the literal.
const lit = (v, type) => {
  if (v === null || v === undefined) return 'null'
  if (type === 'ARRAY') {
    const items = Array.isArray(v) ? v : [v]
    // Inside a Postgres array literal each element is double-quoted, so a
    // backslash and a double quote both need escaping. split/join rather than
    // a regex, because the escaping of the escaping is where this goes wrong.
    const esc = (x) => String(x).split('\\').join('\\\\').split('"').join('\\"')
    return q(`{${items.map((x) => `"${esc(x)}"`).join(',')}}`)
  }
  if (type === 'jsonb' || type === 'json') return q(JSON.stringify(v))
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'object') return q(JSON.stringify(v))
  return q(v)
}

async function columnTypes() {
  const rows = await query(`select table_name, column_name, data_type
    from information_schema.columns where table_schema = 'public'`)
  const map = {}
  for (const r of rows) (map[r.table_name] ??= {})[r.column_name] = r.data_type
  return map
}

console.log(`\n  Reading staging (${PROJECT_REF})...\n`)
const types = await columnTypes()
const parts = [
  '-- Staging data snapshot. GITIGNORED - never commit this.',
  `-- Source: ${PROJECT_REF}. Taken: ${new Date().toISOString()}`,
  '-- Schema comes from migrations; this file carries rows only.',
  'begin;',
  `truncate ${TABLES.join(', ')} restart identity cascade;`,
]

let total = 0
for (const table of TABLES) {
  const rows = await query(`select * from public.${table}`)
  if (!Array.isArray(rows) || rows.length === 0) { console.log(`  ${table.padEnd(24)} 0`); continue }
  const cols = Object.keys(rows[0])
  parts.push(`-- ${table}: ${rows.length}`)
  for (const row of rows) {
    parts.push(`insert into public.${table} (${cols.map((c) => `"${c}"`).join(', ')}) values (${cols.map((c) => lit(row[c], types[table]?.[c])).join(', ')});`)
  }
  console.log(`  ${table.padEnd(24)} ${rows.length}`)
  total += rows.length
}
parts.push('commit;', '')

mkdirSync('supabase/seeds', { recursive: true })
writeFileSync(OUT, parts.join('\n'), 'utf8')
console.log(`\n  ${total} rows -> ${OUT}`)

if (process.argv.includes('--dump-only')) {
  console.log('  --dump-only: not loading.\n')
  process.exit(0)
}

console.log('  Loading into the local stack...')
try {
  execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'], {
    input: parts.join('\n'), stdio: ['pipe', 'inherit', 'inherit'], shell: false,
  })
  console.log('  Loaded.\n')
} catch {
  console.error(`\n  Load failed. The snapshot is still at ${OUT}.`)
  console.error('  Is the local stack up? npm run dev:local -- --no-dev\n')
  process.exit(1)
}
