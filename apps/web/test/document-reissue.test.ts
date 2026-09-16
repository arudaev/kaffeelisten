// Re-downloading and re-sending a delivered document.
//
// The invariant that matters most, legally: reproducing an invoice must NEVER
// allocate a new invoice number. The database fake below makes the number
// allocator throw, so any path that reaches it fails the test.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeClient, type FakeDb } from './support/fakeSupabase'

const state = vi.hoisted(() => ({
  db: null as unknown as FakeDb,
  sent: [] as Array<{ to: string[]; subject: string; html: string; attachments?: { filename: string }[] }>,
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: () => createFakeClient(state.db) }))
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: (typeof state.sent)[number]) => {
        state.sent.push(payload)
        return { data: { id: `msg-${state.sent.length}` }, error: null }
      },
    }
  },
}))

const { regenerateDelivery, resendDelivery, DeliveryNotFoundError } = await import('../api/_lib/report')

const INVOICE_DELIVERY = 'd-invoice'
const INFO_DELIVERY = 'd-info'

function seed(): FakeDb {
  return {
    tables: {
      app_settings: [{
        id: 1, report_recipients: ['admin@itc1.de'], report_accent: '#D97706',
        member_statements_enabled: true, company_documents_enabled: true,
        // Invoice mode is OFF and not authorised today — an already-issued invoice
        // must still be reproducible.
        issue_invoices: false, invoice_mode_authorized: false,
        issuer_legal_name: 'ITC Innovations Technologie Campus GmbH', issuer_address: null,
        issuer_vat_id: 'DE207285819', issuer_iban: 'DE33741500000380009340', issuer_bic: 'BYLADEM1DEG',
        invoice_number_prefix: 'K-', invoice_payment_terms: null, invoice_vat_rate: 19,
      }],
      app_theme: [],
      companies: [
        { id: 'efco', name: 'EFCO', billing_contact_name: 'Eva' },
        { id: '4p', name: '4process', billing_contact_name: 'Paul' },
      ],
      members: [
        { id: 'shen', company_id: 'efco', name: 'Shen Li', work_email: 'shen@efco.de', kind: 'person' },
        { id: 'anna', company_id: '4p', name: 'Anna Keller', work_email: 'anna@4process.de', kind: 'person' },
      ],
      // Espresso has since been repriced from 50 to 80.
      items: [{ id: 'esp', name: 'Espresso', unit_label: 'Tasse', price_cents: 80, category: 'coffee' }],
      transactions: [],
      transactions_archive: [
        { id: 't1', member_id: 'shen', company_id: 'efco', item_id: 'esp', quantity: 4, unit_price_cents: 50,
          logged_at: '2026-06-03T08:00:00.000Z', report_month: '2026-06', item_name: 'Espresso', unit_label: 'Tasse', item_category: 'coffee' },
        { id: 't2', member_id: 'anna', company_id: '4p', item_id: 'esp', quantity: 1, unit_price_cents: 50,
          logged_at: '2026-06-04T08:00:00.000Z', report_month: '2026-06', item_name: 'Espresso', unit_label: 'Tasse', item_category: 'coffee' },
      ],
      billing_documents: [
        { id: 'bd-1', report_month: '2026-06', document_number: 'K-000017', recipient_type: 'member',
          subtotal_cents: 168, tax_cents: 32, total_cents: 200, member_id: 'shen', company_id: 'efco' },
      ],
      document_deliveries: [
        { id: INVOICE_DELIVERY, report_month: '2026-06', kind: 'member_invoice', company_id: 'efco', member_id: 'shen',
          recipient_name: 'Shen Li', recipient_email: 'shen@efco.de', document_number: 'K-000017',
          billing_document_id: 'bd-1', gross_cents: 200, has_pdf: true, has_xlsx: true,
          resend_message_id: 'msg-original', resend_of: null, sent_at: '2026-07-01T20:00:00.000Z' },
        { id: INFO_DELIVERY, report_month: '2026-06', kind: 'member_info', company_id: '4p', member_id: 'anna',
          recipient_name: 'Anna Keller', recipient_email: 'anna@4process.de', document_number: null,
          billing_document_id: null, gross_cents: 50, has_pdf: true, has_xlsx: true,
          resend_message_id: 'msg-original-2', resend_of: null, sent_at: '2026-07-01T20:00:00.000Z' },
      ],
    },
    rpc: {
      next_billing_document_number: () => {
        throw new Error('A re-issued document must never allocate a new invoice number')
      },
    },
  }
}

beforeEach(() => {
  state.db = seed()
  state.sent = []
  process.env.RESEND_API_KEY = 'test'
  process.env.VITE_SUPABASE_URL = 'http://fake'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake'
})

describe('regenerateDelivery', () => {
  it('reproduces an invoice with its original number and stored amounts', async () => {
    const doc = await regenerateDelivery(INVOICE_DELIVERY)
    expect(doc.html).toContain('K-000017')
    expect(doc.html).toContain('€ 2,00')      // stored gross
    expect(doc.html).toContain('€ 1,68')      // stored net
    expect(doc.fileStem).toBe('Rechnung-K-000017')
  })

  it('bills the archived snapshot, not today’s price', async () => {
    const doc = await regenerateDelivery(INVOICE_DELIVERY)
    expect(doc.html).not.toContain('€ 3,20') // 4 × 0,80 would be the repriced total
  })

  it('works even though invoice mode is off today', async () => {
    await expect(regenerateDelivery(INVOICE_DELIVERY)).resolves.toBeDefined()
  })

  it('reproduces an information copy as one — no invoice, no IBAN', async () => {
    const doc = await regenerateDelivery(INFO_DELIVERY)
    expect(doc.html).toMatch(/nur zur Information/)
    expect(doc.html).toContain('4process')
    expect(doc.html).not.toContain('IBAN')
  })

  it('reports a missing delivery distinctly, so the API can answer 404', async () => {
    await expect(regenerateDelivery('nope')).rejects.toBeInstanceOf(DeliveryNotFoundError)
  })
})

describe('resendDelivery', () => {
  it('re-sends to the original recipient and appends a ledger row, leaving the original untouched', async () => {
    const before = { ...state.db.tables.document_deliveries.find(d => d.id === INVOICE_DELIVERY)! }
    const { id } = await resendDelivery(INVOICE_DELIVERY, async () => Buffer.from('%PDF'))

    expect(state.sent).toHaveLength(1)
    expect(state.sent[0].to).toEqual(['shen@efco.de'])
    expect(state.sent[0].attachments!.map(a => a.filename)).toEqual(['Rechnung-K-000017.pdf', 'Rechnung-K-000017.xlsx'])

    const ledger = state.db.tables.document_deliveries
    expect(ledger).toHaveLength(3)
    expect(ledger.find(d => d.id === INVOICE_DELIVERY)).toEqual(before)
    expect(ledger.find(d => d.id === id)).toMatchObject({
      resend_of: INVOICE_DELIVERY, document_number: 'K-000017', kind: 'member_invoice', has_pdf: true,
    })
  })

  it('still re-sends, with its Excel, when the PDF cannot be rendered — and records that', async () => {
    const { id } = await resendDelivery(INFO_DELIVERY, async () => null)
    expect(state.sent[0].attachments!.map(a => a.filename).some(n => n.endsWith('.xlsx'))).toBe(true)
    expect(state.db.tables.document_deliveries.find(d => d.id === id)).toMatchObject({ has_pdf: false, has_xlsx: true })
  })
})
