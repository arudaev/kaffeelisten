import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Guards the invariant that broke production once (see migration 022): when the
// RLS lockdown moved all admin catalogue writes to the service-role API, the
// `service_role` role still only had SELECT on members/companies/items, so every
// admin create/edit failed with "permission denied" while reads kept working.
//
// The admin data API (api/admin/data.ts) reads AND writes members, companies and
// items through the service-role client, which bypasses RLS but STILL needs
// object-level grants. This test replays every migration's GRANT/REVOKE for
// service_role in filename order and asserts the effective privileges cover what
// the API does. If you add a table the admin/report path writes, add its grant
// in a migration and extend REQUIRED below — CI will hold you to it.

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../supabase/migrations')

type Priv = 'select' | 'insert' | 'update' | 'delete'
const ALL_PRIVS: Priv[] = ['select', 'insert', 'update', 'delete']

// Privileges the service-role serverless functions need per table.
const REQUIRED: Record<string, Priv[]> = {
  members: ['select', 'insert', 'update'],
  companies: ['select', 'insert', 'update'],
  items: ['select', 'insert', 'update'],
  // Invoice ledger (migration 025) — the billing run reads, inserts and updates
  // (void/mark-paid) these through the service-role client.
  billing_runs: ['select', 'insert', 'update'],
  billing_documents: ['select', 'insert', 'update'],
  // Per-member payment ledger (migration 027) — the admin Employees tab reads,
  // inserts and updates (paid toggle) these through the service-role client.
  member_payments: ['select', 'insert', 'update'],
  // Per-company payment ledger (migration 035) — the company paid tick in the
  // Mitarbeitende tab reads, inserts and updates through the service-role client.
  company_payments: ['select', 'insert', 'update'],
  // Delivery ledger (migration 037) — the monthly run appends, the admin reads.
  document_deliveries: ['select', 'insert'],
  // Run progress (migration 040) — the monthly run writes progress on its run row.
  report_runs: ['select', 'insert', 'update'],
  // Delivery events (migration 040) — the Resend webhook appends, the admin reads.
  email_delivery_events: ['select', 'insert'],
}

// Privileges service_role must NOT hold per table.
const FORBIDDEN: Record<string, Priv[]> = {
  // The archive is the permanent record of reported months (migration 040).
  // Deleting from it once destroyed all history after ~2-3 months.
  transactions_archive: ['delete'],
  // A payment record is never removed on its own (migration 035).
  company_payments: ['delete'],
  // Append-only: a re-send adds a row, it never rewrites or removes one.
  document_deliveries: ['update', 'delete'],
  email_delivery_events: ['update', 'delete'],
}

// Privileges that exist in production only through Supabase's bootstrap
// `grant all on public tables to service_role`, which no migration file shows.
// The replay below cannot see a bootstrap grant, so a FORBIDDEN check alone
// would pass even if nothing revoked it. These must each be revoked EXPLICITLY.
const MUST_REVOKE_EXPLICITLY: Record<string, Priv[]> = {
  transactions_archive: ['delete'],
  company_payments: ['delete'],
  document_deliveries: ['update', 'delete'],
  email_delivery_events: ['update', 'delete'],
}

/**
 * Replay grant/revoke statements in migration order and return the effective
 * set of privileges service_role holds per table, plus every privilege whose
 * most recent statement was an explicit revoke. Column-level grants
 * (`grant select (col, ...) on ...`) are ignored — they only ever target anon.
 */
function replayServiceRoleGrants(): { state: Map<string, Set<Priv>>; revoked: Map<string, Set<Priv>> } {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
  const state = new Map<string, Set<Priv>>()
  const revoked = new Map<string, Set<Priv>>()

  // grant|revoke  <privs, no column list>  on [table] public.<t>  to|from  <roles> ;
  const stmt =
    /\b(grant|revoke)\s+((?:[a-z]+\s*,\s*)*[a-z]+)\s+on\s+(?:table\s+)?public\.(\w+)\s+(?:to|from)\s+([^;]+);/gis

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    for (const m of sql.matchAll(stmt)) {
      const [, verb, privRaw, table, rolesRaw] = m
      if (!/\bservice_role\b/i.test(rolesRaw)) continue

      const tokens = privRaw.toLowerCase().split(',').map((s) => s.trim())
      const privs: Priv[] = tokens.includes('all')
        ? [...ALL_PRIVS]
        : (tokens.filter((t): t is Priv => (ALL_PRIVS as string[]).includes(t)))

      const set = state.get(table) ?? new Set<Priv>()
      const revokedSet = revoked.get(table) ?? new Set<Priv>()
      const isGrant = verb.toLowerCase() === 'grant'
      for (const p of privs) {
        if (isGrant) {
          set.add(p)
          revokedSet.delete(p)
        } else {
          set.delete(p)
          revokedSet.add(p)
        }
      }
      state.set(table, set)
      revoked.set(table, revokedSet)
    }
  }
  return { state, revoked }
}

describe('service_role migration grants', () => {
  const { state: privs, revoked } = replayServiceRoleGrants()

  for (const [table, required] of Object.entries(REQUIRED)) {
    it(`service_role can ${required.join('/')} public.${table}`, () => {
      const have = privs.get(table) ?? new Set<Priv>()
      expect([...required].filter((p) => !have.has(p))).toEqual([])
    })
  }

  for (const [table, forbidden] of Object.entries(FORBIDDEN)) {
    it(`service_role cannot ${forbidden.join('/')} public.${table}`, () => {
      const have = privs.get(table) ?? new Set<Priv>()
      expect(forbidden.filter((p) => have.has(p))).toEqual([])
    })
  }

  for (const [table, mustRevoke] of Object.entries(MUST_REVOKE_EXPLICITLY)) {
    it(`a migration explicitly revokes ${mustRevoke.join('/')} on public.${table}, never re-granted`, () => {
      const have = revoked.get(table) ?? new Set<Priv>()
      expect(mustRevoke.filter((p) => !have.has(p))).toEqual([])
    })
  }
})
