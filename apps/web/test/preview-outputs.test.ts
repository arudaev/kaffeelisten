// The settings preview shows the attachments a recipient gets, not just the email:
// the PDF and a table view of the Excel file (owner request, 2026-09-16).

import { describe, expect, it, vi } from 'vitest'

vi.mock('../api/_lib/adminAuth', () => ({ requireAdmin: async () => ({ ok: true }) }))
vi.mock('../api/_lib/pdf', () => ({
  launchBrowser: async () => ({ close: async () => undefined }),
  pageToPdf: async (_b: unknown, html: string) => Buffer.from(`%PDF-fake ${html.includes('Anlage') ? 'with-appendix' : 'plain'}`),
}))
vi.mock('../api/_lib/report', async importOriginal => {
  const real = await importOriginal<typeof import('../api/_lib/report')>()
  return {
    ...real,
    fetchReportSettings: async () => ({
      recipients: [], ccEmails: [], ceoEmail: null, memberStatementsEnabled: true, companyDocumentsEnabled: true,
      companyPaidMemberReportsEnabled: true, issuer: null,
      format: { accent: '#D97706', reportSubject: null, reportIntro: null, includePdf: true, includeExcel: true, memberSubject: null, memberIntro: null },
      schedule: { autoEnabled: true, autoDay: null },
    }),
    // No live data: the handler falls back to its built-in sample month.
    fetchAndEnrich: async () => ({ transactions: [], monthLabel: 'September 2026', reportMonth: '2026-09' }),
  }
})

const { default: handler, sheetsPreview } = await import('../api/admin/preview-report')

async function call(body: Record<string, unknown>) {
  const out: { status: number; headers: Record<string, string>; body: unknown } = { status: 0, headers: {}, body: undefined }
  const res = {
    setHeader: (k: string, v: string) => { out.headers[k.toLowerCase()] = v; return res },
    status: (c: number) => { out.status = c; return res },
    json: (b: unknown) => { out.body = b; return res },
    send: (b: unknown) => { out.body = b; return res },
  }
  await handler({ method: 'POST', headers: {}, query: {}, body } as never, res as never)
  return out
}

describe('preview-report outputs', () => {
  it('renders the company PDF from the document HTML, with the per-person appendix', async () => {
    const r = await call({ type: 'company', variant: 'invoice', output: 'pdf' })
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toBe('application/pdf')
    expect(String(r.body)).toContain('with-appendix')
  })

  it('returns the Excel file as a download', async () => {
    const r = await call({ type: 'member', variant: 'report', output: 'xlsx' })
    expect(r.headers['content-type']).toContain('spreadsheetml')
    expect(r.headers['content-disposition']).toMatch(/Vorschau-Aufstellung-Person-2026-09\.xlsx/)
  })

  it('returns the Excel sheets as tables for the in-browser preview', async () => {
    const r = await call({ type: 'company', variant: 'report', output: 'sheets' })
    const sheets = (r.body as { sheets: { name: string; rows: string[][] }[] }).sheets
    expect(sheets.map(s => s.name)).toEqual(['Pro Person', 'Pro Person × Artikel', 'Alle Einträge'])
    expect(sheets[1].rows[0]).toEqual(['Person', 'Artikel', 'Menge', 'Einzelpreis', 'Betrag'])
    // Money shows two decimals the way Excel displays it, counts stay integers.
    const firstLine = sheets[1].rows[1]
    expect(firstLine[2]).toMatch(/^\d+$/)
    expect(firstLine[3]).toMatch(/^\d+,\d{2}/)
  })

  it('rejects an unknown output', async () => {
    expect((await call({ type: 'admin', output: 'docx' })).status).toBe(400)
  })

  it('caps the sheet preview rows but reports the real size', async () => {
    const { generateMemberExcel } = await import('../api/_lib/excel')
    const entries = Array.from({ length: 60 }, (_, i) => ({
      id: `t${i}`, member_id: 'm', company_id: 'c', item_id: 'i', quantity: 1, logged_at: '2026-09-02T08:00:00Z',
      member_name: 'Anna', work_email: 'a@example.com', company_name: 'X', item_name: 'Espresso', item_category: 'coffee',
      unit_label: 'Tasse', price_cents: 50, total_cents: 50,
    }))
    const [sheet] = await sheetsPreview(await generateMemberExcel(entries))
    expect(sheet.rows).toHaveLength(25)
    expect(sheet.totalRows).toBe(62) // header + 60 entries + total
  })
})
