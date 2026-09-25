// The real /api/admin/export handler against an in-memory database: auth, query
// parsing, live + archive reads, the row cap, and the response it streams.

import ExcelJS from 'exceljs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeClient, type FakeDb } from './support/fakeSupabase'

const state = vi.hoisted(() => ({ db: null as unknown as FakeDb, authorised: true }))

vi.mock('../api/_lib/adminAuth', () => ({
  requireAdmin: async () => (state.authorised ? { ok: true } : { ok: false, status: 401, error: 'Nicht angemeldet.' }),
  makeAdminClient: () => createFakeClient(state.db),
}))

const { default: handler } = await import('../api/admin/export')

function seed(liveCount = 1): FakeDb {
  return {
    tables: {
      members: [{ id: 'anna', name: 'Anna Keller', work_email: 'anna@efco.de' }],
      companies: [{ id: 'efco', name: 'EFCO' }, { id: 'pbi', name: 'PBI' }],
      items: [{ id: 'esp', name: 'Espresso', unit_label: 'Tasse', category: 'coffee', price_cents: 60 }],
      transactions: Array.from({ length: liveCount }, (_, i) => ({
        id: `live-${i}`, member_id: 'anna', company_id: 'efco', item_id: 'esp',
        quantity: 1, unit_price_cents: 50, logged_at: '2026-09-02T08:00:00.000Z',
      })),
      // May: long since pruned from the live table, present only in the archive.
      transactions_archive: [{
        id: 'may-1', member_id: 'anna', company_id: 'efco', item_id: 'esp', quantity: 2,
        unit_price_cents: 50, logged_at: '2026-05-04T08:00:00.000Z', report_month: '2026-05',
        item_name: 'Espresso', unit_label: 'Tasse', item_category: 'coffee',
      }],
    },
    rpc: {},
  }
}

interface CapturedResponse {
  status: number
  headers: Record<string, string>
  body: unknown
}

async function call(query: Record<string, string>): Promise<CapturedResponse> {
  const out: CapturedResponse = { status: 0, headers: {}, body: undefined }
  const res = {
    setHeader: (k: string, v: string) => { out.headers[k.toLowerCase()] = v },
    status: (code: number) => { out.status = code; return res },
    json: (b: unknown) => { out.body = b; return res },
    send: (b: unknown) => { out.body = b; return res },
  }
  await handler({ method: 'GET', headers: {}, query } as never, res as never)
  return out
}

beforeEach(() => {
  state.db = seed()
  state.authorised = true
})

describe('GET /api/admin/export', () => {
  it('refuses an unauthenticated request', async () => {
    state.authorised = false
    expect((await call({ from: '2026-05-01', to: '2026-05-31' })).status).toBe(401)
  })

  it('exports a month that exists only in the archive', async () => {
    const r = await call({ from: '2026-05-01', to: '2026-05-31', format: 'csv' })
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toContain('text/csv')
    expect(r.headers['content-disposition']).toMatch(/attachment; filename="kaffeelisten-export-2026-05-01_2026-05-31\.csv"/)
    const csv = String(r.body)
    expect(csv).toContain('"Anna Keller"')
    expect(csv).toContain('"1,00"') // 2 × 0,50 from the snapshot, not 2 × 0,60
    expect(csv).not.toContain('02.09.2026') // the live September entry is out of range
  })

  it('returns a real workbook for xlsx', async () => {
    const r = await call({ from: '2026-01-01', to: '2026-12-31', format: 'xlsx', company_id: 'efco' })
    expect(r.status).toBe(200)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(r.body as Buffer)
    expect(wb.worksheets.map(w => w.name)).toEqual(['Info', 'Einträge', 'Zusammenfassung'])
    // Two entries (May archive + September live) plus header and total row.
    expect(wb.getWorksheet('Einträge')!.actualRowCount).toBe(4)
  })

  it('scopes to a company, returning nothing for one without entries', async () => {
    const r = await call({ from: '2026-01-01', to: '2026-12-31', format: 'csv', company_id: 'pbi' })
    expect(String(r.body).trim().split('\r\n')).toHaveLength(1) // header only
  })

  it('rejects a bad range with a readable message', async () => {
    const r = await call({ from: '2026-09-01', to: '2026-08-01' })
    expect(r.status).toBe(400)
    expect((r.body as { error: string }).error).toMatch(/Startdatum/)
  })

  it('refuses an oversized PDF instead of timing out, and suggests a spreadsheet', async () => {
    state.db = seed(2_001)
    const r = await call({ from: '2026-09-01', to: '2026-09-30', format: 'pdf' })
    expect(r.status).toBe(413)
    expect((r.body as { error: string }).error).toMatch(/CSV\/Excel/)
  })
})
