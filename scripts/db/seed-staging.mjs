#!/usr/bin/env node
// Load a seed file into the STAGING project through the Management API.
// Refuses the production project unconditionally: production never gets seeds.
//
//   node scripts/db/seed-staging.mjs --project-ref <staging ref> [file]
//   (default file: supabase/seeds/staging_roster.local.sql, gitignored)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PRODUCTION_REF = 'fdnfdscpefxqvtggbbbr'
const args = process.argv.slice(2)
const refIdx = args.indexOf('--project-ref')
const ref = refIdx >= 0 ? args[refIdx + 1] : process.env.STAGING_PROJECT_REF
const file = args.find((a, i) => !a.startsWith('--') && i !== refIdx + 1)
  ?? join(import.meta.dirname, '..', '..', 'supabase', 'seeds', 'staging_roster.local.sql')

if (!ref) throw new Error('pass --project-ref <staging ref> or set STAGING_PROJECT_REF')
if (ref === PRODUCTION_REF) {
  console.error('Refusing: seeds are never applied to production.')
  process.exit(1)
}
if (!process.env.SUPABASE_ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN is not set')

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: readFileSync(file, 'utf8') }),
})
if (!res.ok) {
  console.error(`seed failed: ${res.status} ${(await res.text()).slice(0, 2000)}`)
  process.exit(1)
}
console.log(`seeded ${ref} from ${file}`)
