#!/usr/bin/env node
// Compare the schema of two Supabase projects (normally staging vs production)
// through the Management API, read-only. Both are real Supabase projects, so
// platform defaults (extensions, bootstrap grants) are identical and every
// reported line is a real difference. Exit 1 on drift.
//
//   node scripts/db/drift.mjs --a <staging ref> --b <production ref>
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const refA = args[args.indexOf('--a') + 1]
const refB = args[args.indexOf('--b') + 1]
const token = process.env.SUPABASE_ACCESS_TOKEN
if (!refA || !refB || !token) {
  console.error('usage: SUPABASE_ACCESS_TOKEN=... drift.mjs --a <ref> --b <ref>')
  process.exit(2)
}

const fingerprint = readFileSync(join(import.meta.dirname, 'schema-fingerprint.sql'), 'utf8')
  .split('\n')
  .filter(l => !l.startsWith(String.fromCharCode(92))) // drop psql meta-commands (\pset)
  .join('\n')

async function query(ref, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query/read-only`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`${ref}: ${res.status} ${(await res.text()).slice(0, 500)}`)
  return res.json()
}

const versions = async ref =>
  (await query(ref, 'select version from supabase_migrations.schema_migrations order by version')).map(r => r.version)
const facts = async ref => new Set((await query(ref, fingerprint)).map(r => r.fact))

const [va, vb] = await Promise.all([versions(refA), versions(refB)])
if (va.join() !== vb.join()) {
  const onlyA = va.filter(v => !vb.includes(v))
  const onlyB = vb.filter(v => !va.includes(v))
  console.log(`Migration history differs (only in a: ${onlyA.join(', ') || '-'}; only in b: ${onlyB.join(', ') || '-'}).`)
  console.log('Schema comparison is only meaningful when both have applied the same migrations.')
}
const [fa, fb] = await Promise.all([facts(refA), facts(refB)])
const onlyA = [...fa].filter(f => !fb.has(f)).sort()
const onlyB = [...fb].filter(f => !fa.has(f)).sort()
for (const f of onlyA) console.log(`- ${f}`)
for (const f of onlyB) console.log(`+ ${f}`)
console.log(onlyA.length || onlyB.length ? `drift: ${onlyA.length} only in a, ${onlyB.length} only in b` : 'no schema drift')
process.exit(onlyA.length || onlyB.length ? 1 : 0)
