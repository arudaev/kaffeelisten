import { describe, expect, it } from 'vitest'
import {
  companyBillingTouched,
  companyConfigError,
  hasHouseAccount,
  isInvoice,
  planDeliveries,
  type BillingMode,
  type MatrixCompany,
  type MatrixMember,
  type MatrixSettings,
} from '../api/_lib/documentMatrix'

// The acceptance test for the phase-3 document matrix. Each case is one cell of
// "whoever pays gets the invoice, the other party gets a report".

function company(id: string, mode: BillingMode, o: Partial<MatrixCompany> = {}): MatrixCompany {
  return {
    id, name: id.toUpperCase(), billing_mode: mode,
    billing_contact_name: 'Kontakt', billing_contact_email: `billing@${id}.de`,
    ...o,
  }
}

function member(id: string, companyId: string, o: Partial<MatrixMember> = {}): MatrixMember {
  return { id, company_id: companyId, name: id, email: `${id}@firma.de`, kind: 'person', ...o }
}

const ALL_ON: MatrixSettings = {
  memberStatementsEnabled: true,
  companyDocumentsEnabled: true,
  companyPaidMemberReportsEnabled: true,
  invoiceMode: false,
}

const companies = (...cs: MatrixCompany[]) => new Map(cs.map(c => [c.id, c]))

describe('individual company — each person pays', () => {
  const cos = companies(company('efco', 'individual'))
  const people = [member('shen', 'efco'), member('bettina', 'efco')]

  it('invoice mode: each person gets an invoice, the company a statement', () => {
    const plan = planDeliveries(people, cos, { ...ALL_ON, invoiceMode: true })
    expect(plan.members.map(d => [d.memberId, d.kind])).toEqual([
      ['shen', 'member_invoice'],
      ['bettina', 'member_invoice'],
    ])
    expect(plan.companies).toEqual([
      expect.objectContaining({ companyId: 'efco', kind: 'company_statement' }),
    ])
  })

  it('statement mode: everyone gets a statement; nobody is invoiced', () => {
    const plan = planDeliveries(people, cos, ALL_ON)
    expect(plan.members.every(d => d.kind === 'member_statement')).toBe(true)
    expect(plan.companies[0].kind).toBe('company_statement')
    expect([...plan.members, ...plan.companies].some(d => isInvoice(d.kind))).toBe(false)
  })

  it('never invoices the company, even in invoice mode — the employees pay', () => {
    const plan = planDeliveries(people, cos, { ...ALL_ON, invoiceMode: true })
    expect(plan.companies.some(d => isInvoice(d.kind))).toBe(false)
  })
})

describe('company_paid company — the company pays', () => {
  const cos = companies(company('4process', 'company_paid'))
  const people = [member('anna', '4process'), member('ben', '4process')]

  it('invoice mode: the company gets the invoice, each person an info-only report', () => {
    const plan = planDeliveries(people, cos, { ...ALL_ON, invoiceMode: true })
    expect(plan.companies).toEqual([
      expect.objectContaining({ companyId: '4process', kind: 'company_invoice', email: 'billing@4process.de' }),
    ])
    expect(plan.members.map(d => d.kind)).toEqual(['member_info', 'member_info'])
  })

  it('names the paying company on the info copy', () => {
    const plan = planDeliveries(people, cos, ALL_ON)
    expect(plan.members[0].payerName).toBe('4PROCESS')
  })

  it('members used to receive nothing at all — they now get their information copy', () => {
    const plan = planDeliveries(people, cos, ALL_ON)
    expect(plan.members).toHaveLength(2)
  })

  it('never invoices a person whose company pays', () => {
    const plan = planDeliveries(people, cos, { ...ALL_ON, invoiceMode: true })
    expect(plan.members.some(d => isInvoice(d.kind))).toBe(false)
  })

  it('statement mode: the company gets a statement, not an invoice', () => {
    const plan = planDeliveries(people, cos, ALL_ON)
    expect(plan.companies[0].kind).toBe('company_statement')
  })

  it('info copies can be switched off on their own', () => {
    const plan = planDeliveries(people, cos, { ...ALL_ON, companyPaidMemberReportsEnabled: false })
    expect(plan.members).toEqual([])
    expect(plan.skipped.filter(s => s.recipient === 'member').map(s => s.reason)).toEqual(['disabled', 'disabled'])
    // …without affecting the company's own document.
    expect(plan.companies).toHaveLength(1)
  })
})

describe('employer copies of employee documents', () => {
  it('are off by default', () => {
    const plan = planDeliveries([member('a', 'efco')], companies(company('efco', 'individual')), ALL_ON)
    expect(plan.companies[0].includeMemberCopies).toBe(false)
  })

  it('are included only when the company opted in', () => {
    const cos = companies(company('efco', 'individual', { member_document_copies_enabled: true }))
    const plan = planDeliveries([member('a', 'efco')], cos, ALL_ON)
    expect(plan.companies[0].includeMemberCopies).toBe(true)
  })

  it('are never attached for a company_paid company — its members hold no invoices to copy', () => {
    const cos = companies(company('4process', 'company_paid', { member_document_copies_enabled: true }))
    const plan = planDeliveries([member('a', '4process')], cos, { ...ALL_ON, invoiceMode: true })
    expect(plan.companies[0].includeMemberCopies).toBe(false)
  })
})

describe('skips are explicit, never silent', () => {
  it('a company with no billing contact is reported, not quietly dropped', () => {
    const cos = companies(company('gramm', 'company_paid', { billing_contact_email: null }))
    const plan = planDeliveries([member('harald', 'gramm')], cos, { ...ALL_ON, invoiceMode: true })
    expect(plan.companies).toEqual([])
    expect(plan.skipped).toContainEqual(
      expect.objectContaining({ recipient: 'company', id: 'gramm', reason: 'no_billing_contact' }),
    )
  })

  it('a person with no email is reported', () => {
    const plan = planDeliveries(
      [member('x', 'efco', { email: null })],
      companies(company('efco', 'individual')),
      ALL_ON,
    )
    expect(plan.skipped).toContainEqual(expect.objectContaining({ id: 'x', reason: 'no_email' }))
  })

  it('a house account never receives a personal document, but its company is still billed', () => {
    const cos = companies(company('4process', 'company_paid'))
    const plan = planDeliveries(
      [member('house', '4process', { kind: 'house', email: null })],
      cos,
      { ...ALL_ON, invoiceMode: true },
    )
    expect(plan.members).toEqual([])
    expect(plan.skipped).toContainEqual(expect.objectContaining({ id: 'house', reason: 'house_account' }))
    expect(plan.companies).toEqual([expect.objectContaining({ kind: 'company_invoice' })])
  })

  it('consumption pointing at a missing company is reported', () => {
    const plan = planDeliveries([member('x', 'gone')], companies(), ALL_ON)
    expect(plan.skipped).toContainEqual(expect.objectContaining({ id: 'x', reason: 'unknown_company' }))
  })
})

describe('global switches', () => {
  const cos = companies(company('efco', 'individual'), company('4process', 'company_paid'))
  const people = [member('a', 'efco'), member('b', '4process')]

  it('member documents off: no personal mail of any kind', () => {
    const plan = planDeliveries(people, cos, { ...ALL_ON, memberStatementsEnabled: false })
    expect(plan.members).toEqual([])
    expect(plan.companies).toHaveLength(2)
  })

  it('company documents off: no company mail of any kind', () => {
    const plan = planDeliveries(people, cos, { ...ALL_ON, companyDocumentsEnabled: false })
    expect(plan.companies).toEqual([])
    expect(plan.members).toHaveLength(2)
  })

  it('a company with no consumption that month receives nothing', () => {
    const plan = planDeliveries([member('a', 'efco')], cos, ALL_ON)
    expect(plan.companies.map(c => c.companyId)).toEqual(['efco'])
  })

  it('a mixed campus routes each company by its own mode', () => {
    const plan = planDeliveries(people, cos, { ...ALL_ON, invoiceMode: true })
    expect(Object.fromEntries(plan.members.map(d => [d.memberId, d.kind]))).toEqual({
      a: 'member_invoice',
      b: 'member_info',
    })
    expect(Object.fromEntries(plan.companies.map(d => [d.companyId, d.kind]))).toEqual({
      efco: 'company_statement',
      '4process': 'company_invoice',
    })
  })
})

describe('expected gaps are not reported as problems', () => {
  it('marks shared accounts and person-pays companies without a contact as optional', () => {
    const plan = planDeliveries(
      [
        { id: 'h', company_id: 'ind', name: 'Sammelkonto', email: null, kind: 'house' },
        { id: 'p', company_id: 'ind', name: 'Anna', email: 'anna@example.com', kind: 'person' },
        { id: 'q', company_id: 'paid', name: 'Ben', email: 'ben@example.com', kind: 'person' },
      ],
      new Map([
        ['ind', { id: 'ind', name: 'Gramm', billing_mode: 'individual', billing_contact_name: null, billing_contact_email: null, member_document_copies_enabled: false }],
        ['paid', { id: 'paid', name: 'PBI', billing_mode: 'company_paid', billing_contact_name: null, billing_contact_email: null, member_document_copies_enabled: false }],
      ]),
      { memberStatementsEnabled: true, companyDocumentsEnabled: true, companyPaidMemberReportsEnabled: true, invoiceMode: false },
    )
    const bySkip = Object.fromEntries(plan.skipped.map(s => [`${s.name}:${s.reason}`, !!s.optional]))
    expect(bySkip).toEqual({ 'Sammelkonto:house_account': true, 'Gramm:no_billing_contact': true, 'PBI:no_billing_contact': false })
  })
})

describe('companyConfigError', () => {
  const ok = { checkout_mode: 'member' as const, billing_mode: 'individual' as const, billing_contact_email: null }

  it('accepts an ordinary company where each person pays', () => {
    expect(companyConfigError(ok)).toBeNull()
  })

  it('requires a billing contact when the company pays', () => {
    expect(companyConfigError({ ...ok, billing_mode: 'company_paid' })).toMatch(/Rechnungs-E-Mail/)
  })

  it('accepts company checkout for a paying company with a contact', () => {
    expect(companyConfigError({ checkout_mode: 'company', billing_mode: 'company_paid', billing_contact_email: 'a@b.de' })).toBeNull()
  })

  it('refuses company checkout where individuals would have to pay — there are no individuals', () => {
    expect(companyConfigError({ ...ok, checkout_mode: 'company' })).toMatch(/Firmenkonto/)
  })

  it('treats mixed checkout like company checkout: the company must pay and have a contact', () => {
    expect(companyConfigError({ ...ok, checkout_mode: 'both' })).toMatch(/Firmenkonto/)
    expect(companyConfigError({ checkout_mode: 'both', billing_mode: 'company_paid', billing_contact_email: null })).toMatch(/Rechnungs-E-Mail/)
    expect(companyConfigError({ checkout_mode: 'both', billing_mode: 'company_paid', billing_contact_email: 'a@b.de' })).toBeNull()
  })

  it('knows which modes have a shared account', () => {
    expect(['member', 'company', 'both'].map(m => hasHouseAccount(m as 'member'))).toEqual([false, true, true])
  })
})

describe('companyBillingTouched', () => {
  it('lets a misconfigured company still be renamed or deactivated', () => {
    expect(companyBillingTouched({ active: false }, true)).toBe(false)
    expect(companyBillingTouched({ name: 'Gramm GmbH' }, true)).toBe(false)
  })

  it('checks any partial update that changes billing or checkout', () => {
    expect(companyBillingTouched({ billing_mode: 'company_paid' }, true)).toBe(true)
    expect(companyBillingTouched({ billing_contact_email: '' }, true)).toBe(true)
    expect(companyBillingTouched({ checkout_mode: 'company' }, true)).toBe(true)
  })

  it('always checks a new company', () => {
    expect(companyBillingTouched({ name: 'Neu' }, false)).toBe(true)
  })
})
