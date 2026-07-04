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
}

/**
 * Replay grant/revoke statements in migration order and return the effective
 * set of privileges service_role holds per table. Column-level grants
 * (`grant select (col, ...) on ...`) are ignored — they only ever target anon.
 */
function effectiveServiceRolePrivs(): Map<string, Set<Priv>> {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
  const state = new Map<string, Set<Priv>>()

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
      const isGrant = verb.toLowerCase() === 'grant'
      for (const p of privs) {
        if (isGrant) set.add(p)
        else set.delete(p)
      }
      state.set(table, set)
    }
  }
  return state
}

describe('service_role migration grants', () => {
  const privs = effectiveServiceRolePrivs()

  for (const [table, required] of Object.entries(REQUIRED)) {
    it(`service_role can ${required.join('/')} public.${table}`, () => {
      const have = privs.get(table) ?? new Set<Priv>()
      expect([...required].filter((p) => !have.has(p))).toEqual([])
    })
  }
})
