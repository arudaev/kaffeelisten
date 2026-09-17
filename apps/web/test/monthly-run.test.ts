// End-to-end test of the monthly run: the real runMonthlyReport, against an
// in-memory database, a capturing email provider and a stub PDF renderer.
//
// It proves what the unit tests cannot: that the delivery plan is actually
// executed — the right people get the right documents with both attachments —
// and that the CEO archive really contains a copy of everything that went out.

import JSZip from 'jszip'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeClient, type FakeDb } from './support/fakeSupabase'
import { summariseProgress, type ProgressDelivery, type ProgressRun } from '../shared/reportProgress'

// These tests exercise production delivery; outside production the mail guard
// (api/_lib/mail.ts) would drop the non-example.com recipients they assert on.
process.env.VERCEL_ENV = 'production'

// ── Mocks (hoisted above the import of report.ts) ────────────────────────────

const state = vi.hoisted(() => ({
  db: null as unknown as FakeDb,
  sent: [] as Array<{ to: string[]; cc?: string[]; subject: string; html: string; attachments?: { filename: string; content: string }[] }>,
  failPdfFor: null as RegExp | null,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => createFakeClient(state.db),
}))

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

vi.mock('../api/_lib/pdf', () => ({
  launchBrowser: async () => ({ close: async () => undefined }),
  pageToPdf: async (_browser: unknown, html: string) => {
    if (state.failPdfFor?.test(html)) throw new Error('simulated render failure')
    return Buffer.from(`%PDF stub ${html.length}`)
  },
}))

// No real throttling in tests.
vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void) => {
  fn()
  return 0
}) as unknown as typeof setTimeout)

const { runMonthlyReport } = await import('../api/_lib/report')

// ── Fixture ──────────────────────────────────────────────────────────────────

const EFCO = 'c-efco'
const FOURP = 'c-4process'
const GRAMM = 'c-gramm'

function seed(settings: Record<string, unknown> = {}): FakeDb {
  let seq = 0
  return {
    tables: {
      app_settings: [{
        id: 1,
        report_recipients: ['admin@itc1.de'],
        ceo_email: 'ceo@itc1.de',
        cc_ceo_on_reports: true,
        member_statements_enabled: true,
        company_documents_enabled: true,
        company_paid_member_reports_enabled: true,
        auto_report_enabled: true,
        auto_report_day: null,
        report_accent: '#D97706',
        report_subject: null, report_intro: null,
        report_include_pdf: true, report_include_excel: true,
        member_subject: null, member_intro: null,
        issue_invoices: false,
        invoice_mode_authorized: false,
        issuer_legal_name: 'ITC Innovations Technologie Campus GmbH',
        issuer_address: null,
        issuer_vat_id: 'DE207285819',
        issuer_iban: 'DE33741500000380009340',
        issuer_bic: 'BYLADEM1DEG',
        invoice_number_prefix: 'K-',
        invoice_payment_terms: null,
        invoice_vat_rate: 19,
        ...settings,
      }],
      app_theme: [],
      companies: [
        // Each person pays; the employer opted in to copies.
        { id: EFCO, name: 'EFCO', billing_mode: 'individual', billing_contact_name: 'Eva', billing_contact_email: 'billing@efco.de', member_document_copies_enabled: true, checkout_mode: 'member' },
        // The company pays.
        { id: FOURP, name: '4process', billing_mode: 'company_paid', billing_contact_name: 'Paul', billing_contact_email: 'billing@4process.de', member_document_copies_enabled: false, checkout_mode: 'member' },
        // The company pays but nobody entered a contact — must be reported, not silently dropped.
        { id: GRAMM, name: 'Gramm', billing_mode: 'company_paid', billing_contact_name: null, billing_contact_email: null, member_document_copies_enabled: false, checkout_mode: 'member' },
      ],
      members: [
        { id: 'm-shen',    company_id: EFCO,  name: 'Shen Li',       work_email: 'shen@efco.de',   kind: 'person' },
        { id: 'm-bettina', company_id: EFCO,  name: 'Bettina Roth',  work_email: 'bettina@efco.de', kind: 'person' },
        { id: 'm-anna',    company_id: FOURP, name: 'Anna Keller',   work_email: 'anna@4process.de', kind: 'person' },
        { id: 'm-harald',  company_id: GRAMM, name: 'Harald Schmid', work_email: 'harald@gramm.de', kind: 'person' },
      ],
      items: [
        { id: 'i-esp', name: 'Espresso',   unit_label: 'Tasse', price_cents: 50, category: 'coffee' },
        // Repriced since August: the snapshot of 70 must be what gets billed.
        { id: 'i-cap', name: 'Cappuccino', unit_label: 'Tasse', price_cents: 90, category: 'coffee' },
      ],
      transactions: [
        { id: 't1', member_id: 'm-shen',    company_id: EFCO,  item_id: 'i-esp', quantity: 2, unit_price_cents: 50, logged_at: '2026-08-04T08:00:00.000Z' },
        { id: 't2', member_id: 'm-bettina', company_id: EFCO,  item_id: 'i-cap', quantity: 1, unit_price_cents: 70, logged_at: '2026-08-05T08:00:00.000Z' },
        { id: 't3', member_id: 'm-anna',    company_id: FOURP, item_id: 'i-cap', quantity: 3, unit_price_cents: 70, logged_at: '2026-08-06T08:00:00.000Z' },
        { id: 't4', member_id: 'm-harald',  company_id: GRAMM, item_id: 'i-esp', quantity: 1, unit_price_cents: 50, logged_at: '2026-08-07T08:00:00.000Z' },
        // Previous month, for the roll-up comparison.
        { id: 't0', member_id: 'm-shen',    company_id: EFCO,  item_id: 'i-esp', quantity: 1, unit_price_cents: 50, logged_at: '2026-07-15T08:00:00.000Z' },
      ],
      transactions_archive: [],
      report_runs: [],
      billing_runs: [],
      billing_documents: [],
      document_deliveries: [],
    },
    rpc: {
      prune_reported_transactions: () => 0,
      next_billing_document_number: () => ++seq,
    },
  }
}

const mailTo = (addr: string) => state.sent.filter(m => m.to.includes(addr))
const names = (m: (typeof state.sent)[number]) => (m.attachments ?? []).map(a => a.filename)

async function ceoZip(): Promise<JSZip> {
  // The archive goes to the CEO alone, in its own email (ITC1, 2026-09-16).
  const archive = state.sent.find(m => m.to.includes('ceo@itc1.de') && (m.attachments ?? []).some(a => a.filename.endsWith('.zip')))!
  const zip = archive.attachments!.find(a => a.filename.endsWith('.zip'))!
  return JSZip.loadAsync(Buffer.from(zip.content, 'base64'))
}

beforeEach(() => {
  state.sent = []
  state.failPdfFor = null
  process.env.RESEND_API_KEY = 'test'
  process.env.VITE_SUPABASE_URL = 'http://fake'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake'
})

// ── Statement mode ───────────────────────────────────────────────────────────
// Only invoices carry a PDF and an Excel (owner decision 2026-09-16); every
// statement and information copy is the email alone.

const hasFiles = (m: (typeof state.sent)[number]) => names(m).some(n => n.endsWith('.pdf') || n.endsWith('.xlsx') || n.startsWith('Mitarbeitende-'))

describe('statement mode, mixed campus', () => {
  beforeEach(() => { state.db = seed() })

  it('sends statements and information copies as email only, without PDF or Excel', async () => {
    await runMonthlyReport('2026-08', { force: true })
    const [shen] = mailTo('shen@efco.de')
    expect(shen.subject).toContain('Aufstellung')
    for (const addr of ['shen@efco.de', 'bettina@efco.de', 'anna@4process.de', 'billing@efco.de', 'billing@4process.de']) {
      expect(hasFiles(mailTo(addr)[0]), addr).toBe(false)
    }
    // With nothing attached, the email itself says what was consumed.
    expect(shen.html).not.toContain('Excel')
    // 4process pays and did not ask for the Verzehrliste: the amount, no names.
    expect(mailTo('billing@4process.de')[0].html).not.toContain('Anna Keller')
    expect(mailTo('billing@4process.de')[0].html).toContain('Cappuccino')
    // EFCO's people pay for themselves: EFCO gets the overview of who consumed what.
    expect(mailTo('billing@efco.de')[0].html).toContain('Shen Li')
  })

  it('sends a member of a paying company an information copy naming the payer, with no payment block', async () => {
    await runMonthlyReport('2026-08', { force: true })
    const [anna] = mailTo('anna@4process.de')
    expect(anna).toBeDefined()
    expect(anna.html).toMatch(/nur zur Information/)
    expect(anna.html).toContain('4process')
    expect(anna.html).not.toContain('IBAN')
  })

  it('bills the snapshot price, not the current catalogue price', async () => {
    await runMonthlyReport('2026-08', { force: true })
    const [anna] = mailTo('anna@4process.de')
    expect(anna.html).toContain('€ 2,10') // 3 × 0,70, not 3 × 0,90
    expect(anna.html).not.toContain('€ 2,70')
  })

  it('reports the paying company with no contact instead of dropping it silently', async () => {
    const result = await runMonthlyReport('2026-08', { force: true })
    expect(result.skipped).toContainEqual(expect.objectContaining({ id: GRAMM, reason: 'no_billing_contact' }))
    expect(state.sent.some(m => m.subject.includes('Gramm'))).toBe(false)
  })

  it('sends the administration a short report with restocking, and no archive', async () => {
    await runMonthlyReport('2026-08', { force: true })
    const [admin] = mailTo('admin@itc1.de')
    expect(names(admin).some(n => n.endsWith('.zip'))).toBe(false)
    expect(names(admin)).toEqual(expect.arrayContaining(['Campus-Auswertung-2026-08.xlsx']))
    expect(admin.html).toContain('Nachbestellung')
    const archives = state.sent.filter(m => names(m).some(n => n.endsWith('.zip')) && !m.to.includes('ceo@itc1.de'))
    // Only an opted-in company may receive a ZIP (its own employees' copies); nobody else.
    for (const m of archives) expect(m.to).not.toContain('admin@itc1.de')
  })

  it('gives the CEO an archive with the delivery list, report and roll-up, and no document files', async () => {
    await runMonthlyReport('2026-08', { force: true })
    const zip = await ceoZip()
    const files = Object.keys(zip.files).filter(f => !zip.files[f].dir)
    expect(files.filter(f => f.startsWith('Personen/') || f.startsWith('Unternehmen/'))).toEqual([])
    expect(files).toContain('Übersicht-versandte-Dokumente-2026-08.xlsx')
    expect(files).toContain('Monatsbericht-2026-08.pdf')
    expect(files).toContain('Campus-Auswertung-2026-08.xlsx')
  })

  it('records every delivered document in the delivery ledger, as email only', async () => {
    const result = await runMonthlyReport('2026-08', { force: true })
    const ledger = state.db.tables.document_deliveries
    // Shen and Bettina pay their own way; Anna (4process) and Harald (Gramm) work
    // for paying companies, so they get information copies. Gramm itself has no
    // billing contact, so only EFCO and 4process receive company documents.
    expect(ledger.map(d => d.kind).sort()).toEqual([
      'company_statement', 'company_statement',
      'member_info', 'member_info', 'member_statement', 'member_statement',
    ])
    expect(ledger.every(d => d.has_pdf === false && d.has_xlsx === false)).toBe(true)
    expect(ledger.every(d => d.document_number === null)).toBe(true)
    // Email-only documents are not "missing" their files.
    expect(result.missingFiles).toEqual({ pdf: 0, xlsx: 0 })
  })

  it('records live progress on the run: the plan, each phase and the report message id', async () => {
    await runMonthlyReport('2026-08', { force: true })
    const run = state.db.tables.report_runs[0]
    const progress = summariseProgress(
      run as unknown as ProgressRun,
      state.db.tables.document_deliveries as unknown as ProgressDelivery[],
      [],
    )
    expect(progress.phase).toBe('done')
    expect(progress.documents).toEqual({
      invoice: { planned: 0, sent: 0 },
      statement: { planned: 4, sent: 4 },
      info: { planned: 2, sent: 2 },
    })
    expect(progress.report.sent).toBe(true)
    expect(progress.report.messageId).toBeTruthy()
    expect(progress.archive).toMatchObject({ planned: true, sent: true })
    expect(progress.failed).toBe(0)
  })

  it('issues no invoice numbers in statement mode', async () => {
    await runMonthlyReport('2026-08', { force: true })
    expect(state.db.tables.billing_documents).toEqual([])
  })

  it('archives the month with the price paid and the item name as they were', async () => {
    await runMonthlyReport('2026-08', { force: true })
    const archived = state.db.tables.transactions_archive.find(r => r.id === 't3')!
    expect(archived).toMatchObject({ report_month: '2026-08', unit_price_cents: 70, item_name: 'Cappuccino' })
    // The previous month is not swept into this month's archive.
    expect(state.db.tables.transactions_archive.some(r => r.id === 't0')).toBe(false)
  })
})

// ── Invoice mode ─────────────────────────────────────────────────────────────

describe('invoice mode', () => {
  it('when authorised: the payer is invoiced with a number, the other party gets a report', async () => {
    state.db = seed({ issue_invoices: true, invoice_mode_authorized: true })
    await runMonthlyReport('2026-08', { force: true })

    expect(mailTo('shen@efco.de')[0].subject).toContain('Rechnung')
    expect(mailTo('shen@efco.de')[0].html).toContain('IBAN')
    expect(mailTo('billing@4process.de')[0].subject).toContain('Rechnung')

    // The employer of individually billed staff is never invoiced.
    expect(mailTo('billing@efco.de')[0].subject).toContain('Aufstellung')
    // A member of a paying company is never invoiced.
    expect(mailTo('anna@4process.de')[0].html).not.toContain('IBAN')

    const docs = state.db.tables.billing_documents
    expect(docs.map(d => d.recipient_email).sort()).toEqual(
      ['bettina@efco.de', 'billing@4process.de', 'shen@efco.de'].sort(),
    )
    expect(new Set(docs.map(d => d.document_number)).size).toBe(3)
    expect(docs.every(d => d.status === 'sent')).toBe(true)
  })

  it('attaches PDF and Excel to invoices only', async () => {
    state.db = seed({ issue_invoices: true, invoice_mode_authorized: true })
    await runMonthlyReport('2026-08', { force: true })
    for (const addr of ['shen@efco.de', 'bettina@efco.de', 'billing@4process.de']) {
      const n = names(mailTo(addr)[0])
      expect(n.some(f => f.endsWith('.pdf')), addr).toBe(true)
      expect(n.some(f => f.endsWith('.xlsx')), addr).toBe(true)
    }
    // Overviews stay email only: EFCO's company statement and Anna's info copy.
    expect(names(mailTo('anna@4process.de')[0]).some(f => f.endsWith('.pdf') || f.endsWith('.xlsx'))).toBe(false)
    expect(names(mailTo('billing@efco.de')[0]).some(f => f.endsWith('.pdf') || f.endsWith('.xlsx'))).toBe(false)
  })

  it('attaches the employees invoices only for the company that opted in', async () => {
    state.db = seed({ issue_invoices: true, invoice_mode_authorized: true })
    await runMonthlyReport('2026-08', { force: true })
    expect(names(mailTo('billing@efco.de')[0]).some(n => n.startsWith('Mitarbeitende-'))).toBe(true)
    expect(names(mailTo('billing@4process.de')[0]).some(n => n.startsWith('Mitarbeitende-'))).toBe(false)
  })

  it("never names employees on a paying company's invoice; the Verzehrliste goes only on request", async () => {
    state.db = seed({ issue_invoices: true, invoice_mode_authorized: true })
    await runMonthlyReport('2026-08', { force: true })
    const plain = mailTo('billing@4process.de')[0]
    expect(plain.html).not.toContain('Anna Keller')
    expect(names(plain).some(n => n.startsWith('Verzehrliste-'))).toBe(false)

    state.sent = []
    state.db = seed({ issue_invoices: true, invoice_mode_authorized: true })
    state.db.tables.companies.find(c => c.id === FOURP)!.employee_list_enabled = true
    await runMonthlyReport('2026-08', { force: true })
    const requested = mailTo('billing@4process.de')[0]
    expect(requested.html).not.toContain('Anna Keller')
    expect(names(requested)).toEqual(expect.arrayContaining(['Verzehrliste-4process-2026-08.pdf', 'Verzehrliste-4process-2026-08.xlsx']))
  })

  it('gives the CEO exact copies of every invoice file', async () => {
    state.db = seed({ issue_invoices: true, invoice_mode_authorized: true })
    await runMonthlyReport('2026-08', { force: true })
    const zip = await ceoZip()
    const files = Object.keys(zip.files).filter(f => !zip.files[f].dir)
    expect(files.filter(f => f.startsWith('Personen/'))).toHaveLength(4)    // Shen, Bettina: PDF + Excel
    expect(files.filter(f => f.startsWith('Unternehmen/'))).toHaveLength(2) // 4process: PDF + Excel
    const [bettina] = mailTo('bettina@efco.de')
    for (const att of bettina.attachments!) {
      const copy = zip.file(`Personen/${att.filename}`)
      expect(copy, att.filename).not.toBeNull()
      expect((await copy!.async('nodebuffer')).equals(Buffer.from(att.content, 'base64'))).toBe(true)
    }
  })

  it('when switched on but NOT authorised: nothing is invoiced', async () => {
    state.db = seed({ issue_invoices: true, invoice_mode_authorized: false })
    await runMonthlyReport('2026-08', { force: true })
    expect(state.db.tables.billing_documents).toEqual([])
    expect(state.sent.some(m => m.subject.includes('Rechnung'))).toBe(false)
  })
})

// ── Failure handling ─────────────────────────────────────────────────────────

describe('a PDF that cannot be rendered', () => {
  it('still delivers the invoice, keeps its Excel, and flags the gap in the archive manifest', async () => {
    state.db = seed({ issue_invoices: true, invoice_mode_authorized: true })
    // Only Bettina's own document greets her by name. A bare /Bettina/ would also
    // fail EFCO's company document and the monthly report, which list her.
    state.failPdfFor = /Hallo Bettina,/
    const result = await runMonthlyReport('2026-08', { force: true })

    const [bettina] = mailTo('bettina@efco.de')
    expect(names(bettina).some(n => n.endsWith('.xlsx'))).toBe(true)
    expect(names(bettina).some(n => n.endsWith('.pdf'))).toBe(false)
    expect(result.missingFiles).toEqual({ pdf: 1, xlsx: 0 })

    const zip = await ceoZip()
    const personPdfs = Object.keys(zip.files).filter(f => f.startsWith('Personen/') && f.endsWith('.pdf'))
    expect(personPdfs).toHaveLength(1) // Shen's is intact
    const personXlsx = Object.keys(zip.files).filter(f => f.startsWith('Personen/') && f.endsWith('.xlsx'))
    expect(personXlsx).toHaveLength(2)
    expect(zip.file('Übersicht-versandte-Dokumente-2026-08.xlsx')).not.toBeNull()
  })
})
