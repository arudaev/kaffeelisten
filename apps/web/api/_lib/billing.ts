// Invoice ledger + numbering — isolated from the report path so the statement
// flow is untouched when invoice mode is off. The invoice is always ITC1's
// document (issuer data from app_settings); the app only renders and numbers it.

import type { createClient } from '@supabase/supabase-js'
import type { InvoiceRender } from './reportHtml'
import type { Database } from '../../src/lib/database.types'

// Match the service-role client shape report.ts creates via createClient(url, key)
// (typed against the DB schema so ledger writes are checked, not `never`).
type SupabaseClient = ReturnType<typeof createClient<Database, 'public'>>

export interface IssuerConfig {
  legalName: string
  address: string | null
  vatId: string
  iban: string
  bic: string
  numberPrefix: string
  paymentTerms: string | null
  vatRate: number
}

// The app_settings columns the issuer config is built from.
export interface IssuerRow {
  issue_invoices: boolean
  issuer_legal_name: string | null
  issuer_address: string | null
  issuer_vat_id: string | null
  issuer_iban: string | null
  issuer_bic: string | null
  invoice_number_prefix: string | null
  invoice_payment_terms: string | null
  invoice_vat_rate: number
}

// Effective issuer config — present only when invoice mode is on AND every
// mandatory field is set. Mirrors the guard in api/admin/settings.ts so the
// report path can never issue an invoice with a missing issuer/VAT id/account.
export function resolveIssuer(row: IssuerRow | null | undefined): IssuerConfig | null {
  if (!row || !row.issue_invoices) return null
  if (!row.issuer_legal_name || !row.issuer_vat_id || !row.issuer_iban || !row.issuer_bic) return null
  return {
    legalName: row.issuer_legal_name,
    address: row.issuer_address,
    vatId: row.issuer_vat_id,
    iban: row.issuer_iban,
    bic: row.issuer_bic,
    numberPrefix: row.invoice_number_prefix ?? '',
    paymentTerms: row.invoice_payment_terms,
    vatRate: row.invoice_vat_rate,
  }
}

// Sample issuer for previews before the admin has filled the real block — so an
// invoice preview shows realistic placeholders instead of blanks. Values are from
// ITC1's Kaffeerechnung-Vorlage; clearly a preview stand-in, never used to send.
export const PLACEHOLDER_ISSUER: IssuerConfig = {
  legalName: 'ITC Innovations Technologie Campus GmbH',
  address: 'Ulrichsberger Str. 17\n94469 Deggendorf',
  vatId: 'DE207285819',
  iban: 'DE33 7415 0000 0380 0093 40',
  bic: 'BYLADEM1DEG',
  numberPrefix: 'K-',
  paymentTerms: 'Zahlung ohne Abzug innerhalb 14 Tagen nach Rechnungsstellung.',
  vatRate: 19,
}

export interface VatSplit {
  netCents: number
  taxCents: number
  grossCents: number
}

// Item prices are stored gross (incl. VAT) — the template shows an Endbetrag
// "incl. 19% USt". Split a gross total into net + VAT for the invoice breakdown.
export function splitVat(grossCents: number, vatRate: number): VatSplit {
  const netCents = Math.round(grossCents / (1 + vatRate / 100))
  return { netCents, taxCents: grossCents - netCents, grossCents }
}

export function formatDocumentNumber(prefix: string, seq: number): string {
  return `${prefix}${String(seq).padStart(6, '0')}`
}

export function toInvoiceRender(
  issuer: IssuerConfig,
  documentNumber: string,
  split: VatSplit,
): InvoiceRender {
  return {
    documentNumber,
    issuerLegalName: issuer.legalName,
    issuerAddress: issuer.address,
    issuerVatId: issuer.vatId,
    issuerIban: issuer.iban,
    issuerBic: issuer.bic,
    paymentTerms: issuer.paymentTerms,
    vatRate: issuer.vatRate,
    netCents: split.netCents,
    taxCents: split.taxCents,
    grossCents: split.grossCents,
  }
}

export interface BillingDocInput {
  reportMonth: string
  recipientType: 'member' | 'company' | 'itc1_archive'
  recipientName: string
  recipientEmail: string
  companyId: string | null
  memberId: string | null
  subtotalCents: number
  taxCents: number
  totalCents: number
}

export interface BillingDocRow {
  id: string
  document_number: string
  status: string
}

async function findBillingDocument(
  supabase: SupabaseClient,
  input: BillingDocInput,
): Promise<BillingDocRow | null> {
  let q = supabase
    .from('billing_documents')
    .select('id, document_number, status')
    .eq('report_month', input.reportMonth)
  if (input.recipientType === 'member' && input.memberId) {
    q = q.eq('member_id', input.memberId)
  } else if (input.recipientType === 'company' && input.companyId) {
    q = q.eq('company_id', input.companyId).eq('recipient_type', 'company')
  } else {
    return null
  }
  const { data } = await q.maybeSingle()
  return (data as BillingDocRow | null) ?? null
}

// Idempotent: reuse the existing document for (month, member|company) if present
// so a re-run re-sends the same number instead of allocating a new one.
export async function ensureBillingDocument(
  supabase: SupabaseClient,
  prefix: string,
  input: BillingDocInput,
): Promise<BillingDocRow> {
  const existing = await findBillingDocument(supabase, input)
  if (existing) return existing

  const { data: seq, error: seqErr } = await supabase.rpc('next_billing_document_number')
  if (seqErr) throw new Error(`allocate document number failed: ${seqErr.message}`)
  const documentNumber = formatDocumentNumber(prefix, Number(seq))

  const { data, error } = await supabase
    .from('billing_documents')
    .insert({
      report_month: input.reportMonth,
      document_number: documentNumber,
      recipient_type: input.recipientType,
      recipient_name: input.recipientName,
      recipient_email: input.recipientEmail,
      company_id: input.companyId,
      member_id: input.memberId,
      subtotal_cents: input.subtotalCents,
      tax_cents: input.taxCents,
      total_cents: input.totalCents,
      status: 'draft',
    })
    .select('id, document_number, status')
    .single()

  if (error) {
    // A concurrent insert won the partial-unique index — return the winning row.
    const again = await findBillingDocument(supabase, input)
    if (again) return again
    throw new Error(`insert billing document failed: ${error.message}`)
  }
  return data as BillingDocRow
}

export async function markBillingDocumentSent(
  supabase: SupabaseClient,
  id: string,
  messageId: string | null,
): Promise<void> {
  await supabase
    .from('billing_documents')
    .update({ status: 'sent', sent_at: new Date().toISOString(), resend_message_id: messageId })
    .eq('id', id)
}

export async function markBillingDocumentFailed(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from('billing_documents').update({ status: 'failed' }).eq('id', id)
}
