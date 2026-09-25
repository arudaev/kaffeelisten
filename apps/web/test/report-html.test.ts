import { describe, expect, it } from 'vitest'
import {
  buildMemberStatementHtml,
  formatDate,
  escapeHtml,
  renderTemplate,
  type EnrichedTransaction,
  type InvoiceRender,
} from '../api/_lib/reportHtml'
import { resolveReportSubject, type ReportFormat } from '../api/_lib/report'

const entry = (o: Partial<EnrichedTransaction> = {}): EnrichedTransaction => ({
  id: 't1', member_id: 'm', company_id: 'c', item_id: 'i', quantity: 1,
  logged_at: '2026-08-05T09:00:00Z', member_name: 'Anna Keller', work_email: 'anna@x.de',
  company_name: '4process', item_name: 'Espresso', item_category: 'coffee', unit_label: 'Tasse',
  price_cents: 50, total_cents: 50,
  ...o,
})

const invoice: InvoiceRender = {
  documentNumber: 'K-000042', issuerLegalName: 'ITC1 GmbH', issuerAddress: null,
  issuerVatId: 'DE123', issuerIban: 'DE33741500000380009340', issuerBic: 'BYLADEM1DEG',
  paymentTerms: 'Zahlbar in 14 Tagen', vatRate: 19, netCents: 42, taxCents: 8, grossCents: 50,
}

describe('buildMemberStatementHtml', () => {
  it('info-only copy names who pays and carries no payment details', () => {
    const html = buildMemberStatementHtml('Anna Keller', [entry()], 'August 2026', {
      infoOnly: { payerName: '4process' },
    })
    expect(html).toContain('4process')
    expect(html).toMatch(/nur zur Information/i)
    expect(html).not.toContain('IBAN')
    expect(html).not.toContain('Zahlbar an')
    expect(html).not.toContain('Rechnung')
  })

  it('an invoice still carries the payment block', () => {
    const html = buildMemberStatementHtml('Anna Keller', [entry()], 'August 2026', { invoice })
    expect(html).toContain('IBAN')
    expect(html).toContain('K-000042')
  })

  it('refuses to render a document that is both an invoice and an information copy', () => {
    expect(() =>
      buildMemberStatementHtml('Anna', [entry()], 'August 2026', { invoice, infoOnly: { payerName: 'X' } }),
    ).toThrow()
  })

  it('escapes item names, which are admin-entered text', () => {
    const html = buildMemberStatementHtml('Anna', [entry({ item_name: '<img src=x onerror=alert(1)>' })], 'August 2026')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x')
  })
})

const format = (o: Partial<ReportFormat> = {}): ReportFormat => ({
  accent: '#D97706',
  reportSubject: null,
  reportIntro: null,
  includePdf: true,
  includeExcel: true,
  memberSubject: null,
  memberIntro: null,
  ...o,
})

describe('escapeHtml', () => {
  it('neutralizes angle brackets, ampersands and quotes', () => {
    expect(escapeHtml('<script>alert("x")&')).toBe('&lt;script&gt;alert(&quot;x&quot;)&amp;')
  })
  it('escapes ampersands before entities to avoid double-encoding gaps', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })
})

describe('renderTemplate', () => {
  it('substitutes known placeholders case-insensitively', () => {
    expect(renderTemplate('{Monat} {jahr}: {name}', { monat: 'Juni', jahr: '2026', name: 'Anna' }))
      .toBe('Juni 2026: Anna')
  })
  it('replaces unknown/absent vars with empty string', () => {
    expect(renderTemplate('{gesamt}', {})).toBe('')
  })
})

describe('resolveReportSubject', () => {
  it('falls back to the built-in default subject', () => {
    expect(resolveReportSubject(format(), 'Juni 2026', '2026-06'))
      .toBe('Kaffeelisten – Monatsbericht Juni 2026')
  })
  it('renders a custom subject template', () => {
    // monthLabel already carries the year, so the template uses {monat} alone.
    expect(resolveReportSubject(format({ reportSubject: 'Abrechnung {monat}' }), 'Juni 2026', '2026-06'))
      .toBe('Abrechnung Juni 2026')
  })
})

describe('formatDate', () => {
  it('uses the Berlin calendar day, whatever the server timezone', () => {
    // 22:30 UTC on 31 July is 00:30 on 1 August in Berlin.
    expect(formatDate('2026-07-31T22:30:00.000Z')).toBe('01.08.2026')
  })
})
