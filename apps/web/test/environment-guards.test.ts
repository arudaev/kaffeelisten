import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PRODUCTION_SUPABASE_REF,
  databaseConfigError,
  filterRecipients,
  isProductionDatabaseUrl,
  subjectFor,
} from '../src/lib/environment'
import { classifyServerError, SCHEMA_OUTDATED_MESSAGE } from '../api/_lib/errors'

const sent: Array<Record<string, unknown>> = []
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: Record<string, unknown>) => {
        sent.push(payload)
        return { data: { id: 'real-id' }, error: null, headers: null }
      },
    }
  },
}))

const PROD_URL = `https://${PRODUCTION_SUPABASE_REF}.supabase.co`
const STAGING_URL = 'https://stagingref123.supabase.co'

describe('database guard', () => {
  it('recognises the production project only by its exact ref', () => {
    expect(isProductionDatabaseUrl(PROD_URL)).toBe(true)
    expect(isProductionDatabaseUrl(STAGING_URL)).toBe(false)
    expect(isProductionDatabaseUrl(`https://x${PRODUCTION_SUPABASE_REF}.supabase.co`)).toBe(false)
    expect(isProductionDatabaseUrl(undefined)).toBe(false)
  })

  it('blocks preview, development and non-Vercel runs on the production database', () => {
    for (const env of ['preview', 'development', undefined]) {
      expect(databaseConfigError(PROD_URL, env)).toMatch(/Produktionsdatenbank/)
    }
  })

  it('allows production on production and everything on staging', () => {
    expect(databaseConfigError(PROD_URL, 'production')).toBeNull()
    expect(databaseConfigError(STAGING_URL, 'preview')).toBeNull()
  })
})

describe('recipient filter', () => {
  const input = { to: ['anna@example.com', 'boss@itc1.de'], cc: 'ceo@itc1.de', bcc: ['Test <t@sub.example.com>'] }

  it('passes everyone through in production', () => {
    const r = filterRecipients(input, 'production', undefined)
    expect(r.blocked).toEqual([])
    expect(r.to).toEqual(['anna@example.com', 'boss@itc1.de'])
  })

  it('keeps only allowlisted domains (default example.com, subdomains included) elsewhere', () => {
    const r = filterRecipients(input, 'preview', undefined)
    expect(r.to).toEqual(['anna@example.com'])
    expect(r.cc).toEqual([])
    expect(r.bcc).toEqual(['Test <t@sub.example.com>'])
    expect(r.blocked).toEqual(['boss@itc1.de', 'ceo@itc1.de'])
  })

  it('accepts exact addresses on the allowlist', () => {
    const r = filterRecipients({ to: ['boss@itc1.de', 'other@itc1.de'] }, undefined, 'boss@itc1.de')
    expect(r.to).toEqual(['boss@itc1.de'])
  })

  it('marks non-production subjects', () => {
    expect(subjectFor('Rechnung', 'preview')).toBe('[STAGING] Rechnung')
    expect(subjectFor('Rechnung', 'production')).toBe('Rechnung')
  })
})

describe('makeMailer', () => {
  beforeEach(() => { sent.length = 0 })

  it('never sends to a real address outside production', async () => {
    const { makeMailer } = await import('../api/_lib/mail')
    const mailer = makeMailer('key', { VERCEL_ENV: 'preview' })
    const r = await mailer.emails.send({ from: 'a@kaffeelisten.de', to: ['boss@itc1.de'], subject: 'x', html: '<p/>' })
    expect(sent).toEqual([])
    expect(r.data?.id).toBe('blocked-by-mail-guard')
  })

  it('sends the allowed part with a staging subject', async () => {
    const { makeMailer } = await import('../api/_lib/mail')
    const mailer = makeMailer('key', { VERCEL_ENV: 'preview' })
    await mailer.emails.send({ from: 'a@kaffeelisten.de', to: ['boss@itc1.de', 'anna@example.com'], subject: 'Bericht', html: '<p/>' })
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toEqual(['anna@example.com'])
    expect(sent[0].subject).toBe('[STAGING] Bericht')
  })

  it('is transparent in production', async () => {
    const { makeMailer } = await import('../api/_lib/mail')
    const mailer = makeMailer('key', { VERCEL_ENV: 'production' })
    await mailer.emails.send({ from: 'a@kaffeelisten.de', to: ['boss@itc1.de'], subject: 'Bericht', html: '<p/>' })
    expect(sent[0]).toMatchObject({ to: ['boss@itc1.de'], subject: 'Bericht' })
  })
})

describe('server error classification', () => {
  it('turns a missing column or table into an actionable 503', () => {
    for (const msg of [
      'column members.kind does not exist',
      "Could not find the table 'public.document_deliveries' in the schema cache",
    ]) {
      expect(classifyServerError(new Error(msg))).toEqual({ status: 503, error: SCHEMA_OUTDATED_MESSAGE })
    }
  })

  it('passes the wrong-database message through and hides everything else', () => {
    const guard = databaseConfigError(PROD_URL, 'preview')!
    expect(classifyServerError(new Error(guard))).toEqual({ status: 503, error: guard })
    expect(classifyServerError(new Error('duplicate key value'))).toEqual({ status: 500, error: 'Serverfehler' })
  })
})
