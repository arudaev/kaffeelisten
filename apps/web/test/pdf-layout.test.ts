// 2026-09-17: invoices came out with an empty second page whenever the content
// nearly filled one: the PDF printed the email's grey frame and footer bar, and
// Chrome would not split the single layout cell holding the whole body.

import { describe, expect, it } from 'vitest'
import { pageToPdf } from '../api/_lib/pdf'
import { buildCompanyDocumentHtml, buildEmployeeListHtml, buildMemberStatementHtml, DOC_PAGE_MARKER, type EnrichedTransaction } from '../api/_lib/reportHtml'

const tx: EnrichedTransaction = {
  id: 't', member_id: 'm', company_id: 'c', item_id: 'esp', quantity: 1, logged_at: '2026-09-10T08:00:00Z',
  member_name: 'Harald Schmid', work_email: null, company_name: 'Gramm', item_name: 'Espresso', item_category: 'coffee',
  unit_label: 'Tasse', price_cents: 50, total_cents: 50,
}
const members = [{ member_id: 'm', member_name: 'Harald Schmid', work_email: null, subtotal_cents: 50, entries: [tx] }]

function fakeBrowser() {
  const seen: { options?: Record<string, unknown> } = {}
  const page = {
    setJavaScriptEnabled: async () => undefined,
    setRequestInterception: async () => undefined,
    on: () => undefined,
    setContent: async () => undefined,
    pdf: async (options: Record<string, unknown>) => { seen.options = options; return new Uint8Array([37, 80, 68, 70]) },
    close: async () => undefined,
  }
  return { browser: { newPage: async () => page } as never, seen }
}

describe('document PDFs', () => {
  const documents = {
    member: buildMemberStatementHtml('Harald Schmid', [tx], 'September 2026'),
    company: buildCompanyDocumentHtml('Gramm', null, members, 'September 2026'),
    employeeList: buildEmployeeListHtml('Gramm', members, 'September 2026'),
  }

  it('flow as blocks in print and drop the email frame and footer bar', () => {
    for (const [name, html] of Object.entries(documents)) {
      expect(html, name).toContain(DOC_PAGE_MARKER)
      expect(html, name).toContain('class="doc-card"')
      expect(html, name).toContain('td class="doc-footer"')
      expect(html, name).toMatch(/@media print[\s\S]*display: block !important[\s\S]*td\.doc-footer \{ display: none !important; \}/)
    }
  })

  it('print with page margins and "Seite x von y"', async () => {
    const { browser, seen } = fakeBrowser()
    await pageToPdf(browser, documents.member)
    expect(seen.options).toMatchObject({ displayHeaderFooter: true, margin: { top: '12mm', bottom: '14mm' } })
    expect(String(seen.options?.footerTemplate)).toContain('totalPages')
  })

  it('leave other PDFs (report, export) as they were', async () => {
    const { browser, seen } = fakeBrowser()
    await pageToPdf(browser, '<html><body><table><tr><td>Export</td></tr></table></body></html>')
    expect(seen.options?.displayHeaderFooter).toBeUndefined()
    expect(seen.options?.margin).toEqual({ top: '0', right: '0', bottom: '0', left: '0' })
  })
})
