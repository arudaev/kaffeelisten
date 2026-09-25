import { describe, expect, it } from 'vitest'
// @ts-expect-error -- plain .mjs script shared with CI; it has no type declarations
import { planMigrations, wrapMigration } from '../../../scripts/db/migrate-plan.mjs'

type Plan = { pending: { file: string; version: string }[]; errors: string[] }
const plan = planMigrations as (files: string[], applied: string[]) => Plan
const wrap = wrapMigration as (sql: string, version: string, name: string) => string

describe('migration planning', () => {
  const files = ['001_initial.sql', '029_paid.sql', '030_price.sql', '031_archive.sql', 'README.md']

  it('lists files not yet recorded, in order', () => {
    const r = plan(files, ['001', '029'])
    expect(r.errors).toEqual([])
    expect(r.pending.map(p => p.file)).toEqual(['030_price.sql', '031_archive.sql'])
  })

  it('applies everything to an empty database', () => {
    expect(plan(files, []).pending).toHaveLength(4)
  })

  it('refuses a pending file older than what already ran (the post-deploy trap)', () => {
    const r = plan(['030_a.sql', '032_post.sql', '033_b.sql'], ['030', '033'])
    expect(r.errors).toEqual([expect.stringMatching(/032_post\.sql is older than already-applied 033/)])
  })

  it('refuses a database that ran a migration the repository does not have', () => {
    expect(plan(['001_a.sql'], ['001', '002']).errors).toEqual([expect.stringMatching(/migration 002/)])
  })

  it('records history inside the same transaction as the migration', () => {
    const sql = wrap("select 'it''s';", '030', 'price')
    expect(sql.startsWith('begin;')).toBe(true)
    expect(sql.trim().endsWith('commit;')).toBe(true)
    expect(sql).toContain("values ('030', 'price'")
  })
})
