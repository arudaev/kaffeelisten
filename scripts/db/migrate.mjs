#!/usr/bin/env node
// Apply pending supabase/migrations to a Supabase project through the Management
// API (no database password needed; SUPABASE_ACCESS_TOKEN only).
//
//   node scripts/db/migrate.mjs --project-ref <ref> [--dry-run]
//   node scripts/db/migrate.mjs --project-ref <prod ref> --production   (CI only)
//
// Production is refused unless --production is passed AND it runs in GitHub
// Actions: people and agents never migrate production from a laptop
// (docs/environments.md).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HISTORY_DDL, planMigrations, wrapMigration } from './migrate-plan.mjs'

const PRODUCTION_REF = 'fdnfdscpefxqvtggbbbr'
const args = process.argv.slice(2)
const ref = args[args.indexOf('--project-ref') + 1]
const dryRun = args.includes('--dry-run')
const token = process.env.SUPABASE_ACCESS_TOKEN

if (!args.includes('--project-ref') || !ref) fail('usage: migrate.mjs --project-ref <ref> [--dry-run] [--production]')
if (!token) fail('SUPABASE_ACCESS_TOKEN is not set')
if (ref === PRODUCTION_REF && !dryRun) {
  if (!args.includes('--production') || process.env.GITHUB_ACTIONS !== 'true') {
    fail('Refusing to migrate production outside the "Database - production" GitHub workflow.')
  }
}

async function query(sql, readOnly = false) {
  const url = `https://api.supabase.com/v1/projects/${ref}/database/query${readOnly ? '/read-only' : ''}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 2000)}`)
  return JSON.parse(text)
}

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

const dir = join(import.meta.dirname, '..', '..', 'supabase', 'migrations')
const files = readdirSync(dir).filter(f => f.endsWith('.sql'))

const exists = await query("select to_regclass('supabase_migrations.schema_migrations')::text as t", true)
const applied = exists[0]?.t
  ? (await query('select version from supabase_migrations.schema_migrations order by version', true)).map(r => r.version)
  : []

const { pending, errors } = planMigrations(files, applied)
console.log(`project ${ref}: ${applied.length} applied, ${pending.length} pending`)
for (const m of pending) console.log(`  pending  ${m.file}`)
if (errors.length) fail(errors.map(e => `✗ ${e}`).join('\n'))
if (dryRun || pending.length === 0) process.exit(0)

if (!exists[0]?.t) await query(HISTORY_DDL)
for (const m of pending) {
  const sql = readFileSync(join(dir, m.file), 'utf8')
  try {
    await query(wrapMigration(sql, m.version, m.name))
    console.log(`  applied  ${m.file}`)
  } catch (err) {
    fail(`  FAILED   ${m.file}\n${err instanceof Error ? err.message : err}`)
  }
}
