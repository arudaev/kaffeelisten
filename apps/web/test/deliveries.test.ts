import { describe, expect, it } from 'vitest'
import { needsAttention, resolvedByResend, summariseDeliveries } from '../src/lib/deliveries'
import type { DocumentDelivery } from '../src/lib/adminApi'

function d(o: Partial<DocumentDelivery>): DocumentDelivery {
  return {
    id: 'x', report_month: '2026-08', kind: 'member_statement', company_id: 'c', member_id: 'm',
    recipient_name: 'Anna', recipient_email: 'anna@example.com', document_number: null, billing_document_id: null,
    gross_cents: 100, has_pdf: true, has_xlsx: true, resend_of: null, sent_at: '2026-09-01T20:00:00Z',
    ...o,
  }
}

describe('summariseDeliveries', () => {
  it('counts a re-sent document once, and the re-send separately', () => {
    const s = summariseDeliveries([d({ id: 'a' }), d({ id: 'b' }), d({ id: 'a2', resend_of: 'a' })])
    expect(s).toMatchObject({ documents: 2, resends: 1 })
  })

  it('no longer flags a document whose re-send went out complete', () => {
    const list = [d({ id: 'a', has_pdf: false }), d({ id: 'a2', resend_of: 'a' })]
    expect(summariseDeliveries(list).unresolvedMissing).toBe(0)
    expect(needsAttention(list[0], resolvedByResend(list))).toBe(false)
  })

  it('still flags it when the re-send was also incomplete', () => {
    const list = [d({ id: 'a', has_pdf: false }), d({ id: 'a2', resend_of: 'a', has_pdf: false })]
    expect(summariseDeliveries(list).unresolvedMissing).toBe(1)
  })

  it('counts each kind and totals invoices from originals only', () => {
    const s = summariseDeliveries([
      d({ id: '1', kind: 'member_invoice', gross_cents: 300, document_number: 'K-1' }),
      d({ id: '1r', kind: 'member_invoice', gross_cents: 300, document_number: 'K-1', resend_of: '1' }),
      d({ id: '2', kind: 'company_invoice', gross_cents: 900, member_id: null, document_number: 'K-2' }),
      d({ id: '3', kind: 'member_info' }),
      d({ id: '4', kind: 'company_statement', member_id: null }),
    ])
    expect(s).toMatchObject({ invoices: 2, statements: 1, infos: 1, invoiceTotalCents: 1200 })
  })
})
