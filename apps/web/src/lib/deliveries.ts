// Summarising the delivery ledger for the admin, as pure functions.
//
// A re-send is its own ledger row (resend_of → original). Counting rows directly
// double-counted re-sent documents, and kept flagging a document as "missing its
// PDF" even after a re-send had delivered it complete.

import type { DocumentDelivery } from './adminApi'

export interface DeliverySummary {
  documents: number            // originals only
  resends: number
  invoices: number
  statements: number
  infos: number
  invoiceTotalCents: number
  // Originals that went out without a file and have not since been re-sent complete.
  unresolvedMissing: number
}

export function isComplete(d: Pick<DocumentDelivery, 'has_pdf' | 'has_xlsx'>): boolean {
  return d.has_pdf && d.has_xlsx
}

/** Ids of originals that were missing a file but a later re-send delivered complete. */
export function resolvedByResend(list: readonly DocumentDelivery[]): Set<string> {
  const resolved = new Set<string>()
  for (const d of list) {
    if (d.resend_of && isComplete(d)) resolved.add(d.resend_of)
  }
  return resolved
}

export function needsAttention(d: DocumentDelivery, resolved: ReadonlySet<string>): boolean {
  return !d.resend_of && !isComplete(d) && !resolved.has(d.id)
}

export function summariseDeliveries(list: readonly DocumentDelivery[]): DeliverySummary {
  const originals = list.filter(d => !d.resend_of)
  const resolved = resolvedByResend(list)
  return {
    documents: originals.length,
    resends: list.length - originals.length,
    invoices: originals.filter(d => d.kind.endsWith('_invoice')).length,
    statements: originals.filter(d => d.kind.endsWith('_statement')).length,
    infos: originals.filter(d => d.kind === 'member_info').length,
    invoiceTotalCents: originals.filter(d => d.kind.endsWith('_invoice')).reduce((s, d) => s + d.gross_cents, 0),
    unresolvedMissing: originals.filter(d => needsAttention(d, resolved)).length,
  }
}
