import { describe, expect, it } from 'vitest'
import { escapeHtml, renderTemplate } from '../api/_lib/reportHtml'
import { resolveReportSubject, type ReportFormat } from '../api/_lib/report'

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
