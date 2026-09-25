#!/usr/bin/env node
// Lint supabase/migrations against the rules in scripts/migration-lint.mjs.
// Compares against origin/main, so CI must fetch main first.
//   node scripts/lint-migrations.mjs [base-ref]
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lintMigrations } from './migration-lint.mjs'

const dir = join(import.meta.dirname, '..', 'supabase', 'migrations')
const base = process.argv[2] ?? 'origin/main'

const files = readdirSync(dir)
  .filter(n => n.endsWith('.sql'))
  .map(name => ({ name, sql: readFileSync(join(dir, name), 'utf8') }))

let mainNames = []
try {
  mainNames = execFileSync('git', ['ls-tree', '--name-only', `${base}:supabase/migrations`], { encoding: 'utf8' })
    .split('\n')
    .filter(n => n.endsWith('.sql'))
} catch {
  console.error(`Cannot read ${base}; run "git fetch origin main" first.`)
  process.exit(2)
}

const errors = lintMigrations(files, mainNames)
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`)
  process.exit(1)
}
const pending = files.filter(f => !mainNames.includes(f.name)).map(f => f.name)
console.log(`✓ ${files.length} migrations valid; pending vs ${base}: ${pending.join(', ') || 'none'}`)
