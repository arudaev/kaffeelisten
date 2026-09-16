import { describe, expect, it } from 'vitest'
// @ts-expect-error -- plain .mjs script shared with CI; it has no type declarations
import { lintMigrations } from '../../../scripts/migration-lint.mjs'

const lint = lintMigrations as (files: { name: string; sql: string }[], main: string[]) => string[]
const pre = (body = 'alter table x add column y int;') => `-- deploy: pre\n${body}`
const post = (body = 'revoke delete on x from service_role;') => `-- deploy: post\n${body}`

describe('migration lint', () => {
  const main = ['001_initial.sql', '029_paid_grid_default_on.sql']

  it('accepts tagged, increasing, additive migrations', () => {
    expect(lint([
      { name: '001_initial.sql', sql: 'create table x();' },
      { name: '029_paid_grid_default_on.sql', sql: 'select 1;' },
      { name: '030_a.sql', sql: pre() },
      { name: '031_b.sql', sql: pre() },
    ], main)).toEqual([])
  })

  it('requires a deploy tag from 030 on, but not for the hand-applied baseline', () => {
    const errors = lint([
      { name: '001_initial.sql', sql: 'create table x();' },
      { name: '030_a.sql', sql: 'alter table x add column y int;' },
    ], main)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/030_a\.sql: missing/)
  })

  it('rejects a duplicate number and a new file numbered at or below main', () => {
    const errors = lint([
      { name: '029_other.sql', sql: pre() },
      { name: '029_paid_grid_default_on.sql', sql: 'select 1;' },
    ], main)
    expect(errors.some(e => /already used/.test(e))).toBe(true)
    expect(errors.some(e => /numbered above 029/.test(e))).toBe(true)
  })

  it('rejects a pre-deploy migration that follows a post-deploy one in the same change', () => {
    const errors = lint([
      { name: '032_revoke.sql', sql: post() },
      { name: '033_add.sql', sql: pre() },
    ], main)
    expect(errors).toEqual([expect.stringMatching(/033_add\.sql: pre-deploy migration after post-deploy 032_revoke\.sql/)])
  })

  it('allows post-deploy migrations at the end of a change', () => {
    expect(lint([{ name: '030_add.sql', sql: pre() }, { name: '031_revoke.sql', sql: post() }], main)).toEqual([])
  })

  it('flags destructive statements unless approved, ignoring comments', () => {
    expect(lint([{ name: '030_a.sql', sql: pre('delete from members;') }], main)[0]).toMatch(/destructive/)
    expect(lint([{ name: '030_a.sql', sql: pre('-- we never delete from members\nselect 1;') }], main)).toEqual([])
    expect(lint([{ name: '030_a.sql', sql: pre('-- destructive: approved\ndrop table old;') }], main)).toEqual([])
  })
})
