// Who receives which monthly document — the single, pure source of the routing
// rules. No IO: report.ts executes the plan this returns.
//
// The governing principle, in ITC1's words: whoever pays gets the invoice, the
// other party gets a report, and the CEO gets a copy of everything.
//
//                        member receives           company contact receives
//   individual           invoice | statement       statement (+ member copies if opted in)
//   company_paid         info-only report          invoice | statement
//
// "invoice | statement" resolves on invoice mode (a configured, authorised issuer).
// Every per-person and per-company document carries a PDF and an Excel.
//
// Routing used to live inline in sendMemberStatements / sendCompanyDocuments with
// no tests at all. Among other gaps, members of a company_paid company received
// nothing, and the employer copy of every employee's invoice was sent
// unconditionally. Both are now explicit rules here, covered by
// test/document-matrix.test.ts.

export type BillingMode = 'individual' | 'company_paid'
export type MemberKind = 'person' | 'house'

export interface MatrixCompany {
  id: string
  name: string
  billing_mode: BillingMode
  billing_contact_name: string | null
  billing_contact_email: string | null
  // Employer receives copies of its employees' own documents. Opt-in, and only
  // meaningful where employees are billed individually.
  member_document_copies_enabled?: boolean
}

export interface MatrixMember {
  id: string
  company_id: string
  name: string
  email: string | null
  kind?: MemberKind
}

export interface MatrixSettings {
  memberStatementsEnabled: boolean
  companyDocumentsEnabled: boolean
  // Members of a company_paid company get an information copy of their own use.
  companyPaidMemberReportsEnabled: boolean
  invoiceMode: boolean
}

export type MemberDocKind = 'member_invoice' | 'member_statement' | 'member_info'
export type CompanyDocKind = 'company_invoice' | 'company_statement'

export interface MemberDelivery {
  kind: MemberDocKind
  memberId: string
  companyId: string
  name: string
  email: string
  // member_info only: who bears the cost, printed on the document.
  payerName?: string
}

export interface CompanyDelivery {
  kind: CompanyDocKind
  companyId: string
  companyName: string
  contactName: string | null
  email: string
  // Attach copies of the documents this company's employees received.
  includeMemberCopies: boolean
}

export type SkipReason =
  | 'disabled'              // the relevant setting is off — intentional, not an error
  | 'no_email'              // a person with no reachable address
  | 'no_billing_contact'    // a company with no contact email — cannot be delivered
  | 'house_account'         // a company checkout account has no person to write to
  | 'unknown_company'       // consumption references a company that no longer exists

export interface SkippedDelivery {
  recipient: 'member' | 'company'
  id: string
  name: string
  reason: SkipReason
  // Expected and harmless: a shared account has no inbox, and a company whose
  // people pay for themselves does not need a contact. Not reported as a problem.
  optional?: boolean
}

export interface DeliveryPlan {
  members: MemberDelivery[]
  companies: CompanyDelivery[]
  skipped: SkippedDelivery[]
}

export function isHouseMember(m: Pick<MatrixMember, 'kind'>): boolean {
  return m.kind === 'house'
}

/**
 * Plan the month's deliveries for everyone who consumed something.
 *
 * `consumers` must contain only members with at least one entry that month, and
 * `companies` every company those members belong to. A company appears in the
 * plan only if at least one of its members consumed.
 */
export function planDeliveries(
  consumers: readonly MatrixMember[],
  companies: ReadonlyMap<string, MatrixCompany>,
  settings: MatrixSettings,
): DeliveryPlan {
  const plan: DeliveryPlan = { members: [], companies: [], skipped: [] }
  const consumingCompanyIds = new Set<string>()

  for (const m of consumers) {
    const company = companies.get(m.company_id)
    if (!company) {
      plan.skipped.push({ recipient: 'member', id: m.id, name: m.name, reason: 'unknown_company' })
      continue
    }
    consumingCompanyIds.add(company.id)

    if (isHouseMember(m)) {
      plan.skipped.push({ recipient: 'member', id: m.id, name: m.name, reason: 'house_account', optional: true })
      continue
    }

    const companyPays = company.billing_mode === 'company_paid'
    const enabled = settings.memberStatementsEnabled && (!companyPays || settings.companyPaidMemberReportsEnabled)
    if (!enabled) {
      plan.skipped.push({ recipient: 'member', id: m.id, name: m.name, reason: 'disabled' })
      continue
    }
    if (!m.email) {
      plan.skipped.push({ recipient: 'member', id: m.id, name: m.name, reason: 'no_email' })
      continue
    }

    plan.members.push({
      kind: companyPays ? 'member_info' : settings.invoiceMode ? 'member_invoice' : 'member_statement',
      memberId: m.id,
      companyId: company.id,
      name: m.name,
      email: m.email,
      ...(companyPays ? { payerName: company.name } : {}),
    })
  }

  for (const companyId of consumingCompanyIds) {
    const company = companies.get(companyId)!
    if (!settings.companyDocumentsEnabled) {
      plan.skipped.push({ recipient: 'company', id: company.id, name: company.name, reason: 'disabled' })
      continue
    }
    const companyPays = company.billing_mode === 'company_paid'
    if (!company.billing_contact_email) {
      plan.skipped.push({
        recipient: 'company', id: company.id, name: company.name, reason: 'no_billing_contact',
        ...(companyPays ? {} : { optional: true }),
      })
      continue
    }
    plan.companies.push({
      kind: companyPays && settings.invoiceMode ? 'company_invoice' : 'company_statement',
      companyId: company.id,
      companyName: company.name,
      contactName: company.billing_contact_name,
      email: company.billing_contact_email,
      // Only individually billed employees have documents of their own worth
      // copying, and only where the company has opted in.
      includeMemberCopies: !companyPays && !!company.member_document_copies_enabled,
    })
  }

  return plan
}

/** True when this document demands payment and must carry an invoice number. */
export function isInvoice(kind: MemberDocKind | CompanyDocKind): boolean {
  return kind === 'member_invoice' || kind === 'company_invoice'
}

/**
 * Only an invoice carries a PDF and an Excel attachment (owner decision,
 * 2026-09-16). Statements and information copies are the email alone: they
 * demand nothing, so there is nothing to file, and they keep the run cheap.
 */
export function carriesAttachments(kind: MemberDocKind | CompanyDocKind): boolean {
  return isInvoice(kind)
}

// ─── Company checkout rules (mirrors migration 034) ──────────────────────────

// 'member': people book for themselves. 'company': only the shared account (no
// person step). 'both': people plus the shared account (migration 039).
export type CheckoutMode = 'member' | 'company' | 'both'

/** Whether the company has a shared house account to book on. */
export function hasHouseAccount(mode: CheckoutMode): boolean {
  return mode === 'company' || mode === 'both'
}

/**
 * Why a company's configuration is invalid, or null when it is valid.
 *
 * Company checkout means nobody is registered individually: everything books on
 * one shared account, so there is nobody to bill but the company itself. It is
 * therefore only coherent when the company pays AND has somewhere to send the
 * bill. The API enforces this on every save; migration 034's RPCs assume it.
 */
export function companyConfigError(c: {
  checkout_mode: CheckoutMode
  billing_mode: BillingMode
  billing_contact_email: string | null
}): string | null {
  if (c.billing_mode === 'company_paid' && !c.billing_contact_email) {
    return 'Bei „Firma zahlt“ ist eine Rechnungs-E-Mail-Adresse erforderlich.'
  }
  if (hasHouseAccount(c.checkout_mode) && c.billing_mode !== 'company_paid') {
    return 'Ein gemeinsames Firmenkonto ist nur möglich, wenn die Firma zahlt – sonst gäbe es niemanden, der die Buchungen darauf bezahlt.'
  }
  return null
}

/**
 * Whether a company save changes anything the billing rules govern. A full
 * create always does; a partial update only when it sends one of these fields.
 */
export function companyBillingTouched(body: Record<string, unknown>, partial: boolean): boolean {
  if (!partial) return true
  return ['billing_mode', 'billing_contact_email', 'checkout_mode'].some(k => body[k] !== undefined)
}
