// GET /api/admin/documents lists a month's deliveries with the company name, so a
// company document is recognisable by more than its contact ("Office").

import { describe, expect, it, vi } from 'vitest'
import { createFakeClient, type FakeDb } from './support/fakeSupabase'

const state = vi.hoisted(() => ({ db: null as unknown as FakeDb }))

vi.mock('../api/_lib/adminAuth', () => ({
  requireAdmin: async () => ({ ok: true }),
  makeAdminClient: () => createFakeClient(state.db),
}))

const { default: handler } = await import('../api/admin/documents')

describe('GET /api/admin/documents', () => {
  it('adds the company name to every delivery', async () => {
    const row = (id: string, company_id: string, member_id: string | null, recipient_name: string) => ({
      id, report_month: '2026-08', kind: member_id ? 'member_info' : 'company_statement', company_id, member_id,
      recipient_name, recipient_email: `${id}@example.com`, document_number: null, billing_document_id: null,
      gross_cents: 50, has_pdf: true, has_xlsx: true, resend_of: null, sent_at: '2026-09-16T20:09:00Z',
    })
    state.db = {
      tables: {
        companies: [{ id: 'pbi', name: 'PBI' }, { id: 'inteva', name: 'Inteva' }],
        document_deliveries: [row('d1', 'pbi', null, 'Office'), row('d2', 'inteva', 'kerstin', 'Kerstin F.')],
      },
      rpc: {},
    }
    let body: { deliveries: Array<{ id: string; company_name: string }> } | undefined
    const res = { setHeader: () => res, status: () => res, json: (b: typeof body) => { body = b; return res } }
    await handler({ method: 'GET', headers: {}, query: { month: '2026-08' } } as never, res as never)
    expect(Object.fromEntries(body!.deliveries.map(d => [d.id, d.company_name]))).toEqual({ d1: 'PBI', d2: 'Inteva' })
  })
})
