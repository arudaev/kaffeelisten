#!/usr/bin/env node
// Restore the API grants that migration 038 strips from a co-tenant sharing the
// staging project's `public` schema.
//
//   node scripts/db/restore-cotenant-grants.mjs --project-ref <staging ref>
//
// WHY THIS EXISTS. Supabase's free plan allows two active projects per account,
// so Kaffeelisten's staging/demo schema shares the `voyager-56k` project with
// that application's own tables (docs/environments.md). Migration 038 hardens
// the API roles with a blanket
//
//   revoke all on all functions in schema public from public, anon, authenticated;
//
// which is right for Kaffeelisten and takes the neighbour's grants with it. The
// failure mode is the dangerous kind: Voyager's guestbook returns an empty list
// and its visitor counter stops, with no error raised anywhere. A note in two
// READMEs is not enough for something that silent, so the staging migration job
// repairs it on every run.
//
// A no-op when the co-tenant is not present, so this keeps working unchanged
// once staging has a project to itself again. Refuses production outright.
const PRODUCTION_REF = 'fdnfdscpefxqvtggbbbr'

const args = process.argv.slice(2)
const refIdx = args.indexOf('--project-ref')
const ref = refIdx >= 0 ? args[refIdx + 1] : process.env.STAGING_PROJECT_REF
const token = process.env.SUPABASE_ACCESS_TOKEN

if (!ref) fail('pass --project-ref <ref> or set STAGING_PROJECT_REF')
if (!token) fail('SUPABASE_ACCESS_TOKEN is not set')
if (ref === PRODUCTION_REF) fail('Refusing: production shares its schema with nothing.')

/** Objects a co-tenant owns, the grants it needs, and how to check them. */
const COTENANTS = [
  {
    name: 'voyager-56k guestbook',
    // Present only when every one of these exists; otherwise the whole entry is skipped.
    probe: [
      "to_regclass('public.guestbook')",
      "to_regproc('public.submit_guestbook')",
      "to_regproc('public.increment_visitor')",
    ],
    grants: [
      'grant select on public.guestbook to anon, authenticated',
      'grant execute on function public.submit_guestbook(text, text) to anon, authenticated',
      'grant execute on function public.increment_visitor() to anon, authenticated',
    ],
    checks: {
      reads: "has_table_privilege('anon','public.guestbook','select')",
      submits: "has_function_privilege('anon','public.submit_guestbook(text,text)','execute')",
      counts: "has_function_privilege('anon','public.increment_visitor()','execute')",
    },
  },
]

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

let repaired = 0
for (const tenant of COTENANTS) {
  const probe = tenant.probe.map((p, i) => `${p} is not null as p${i}`).join(', ')
  const [present] = await query(`select ${probe}`, true)
  if (!Object.values(present).every(Boolean)) {
    console.log(`skip     ${tenant.name}: not in this project`)
    continue
  }

  await query(tenant.grants.map(g => `${g};`).join('\n'))

  const checks = Object.entries(tenant.checks).map(([k, v]) => `${v} as ${k}`).join(', ')
  const [after] = await query(`select ${checks}`, true)
  const missing = Object.entries(after).filter(([, ok]) => !ok).map(([k]) => k)
  if (missing.length) fail(`  FAILED ${tenant.name}: still missing ${missing.join(', ')}`)

  console.log(`restored ${tenant.name}: ${Object.keys(after).join(', ')} all granted`)
  repaired += 1
}

console.log(repaired === 0 ? 'no co-tenant in this project; nothing to restore' : `${repaired} co-tenant(s) verified`)
