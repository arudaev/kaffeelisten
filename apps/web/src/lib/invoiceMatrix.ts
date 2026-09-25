// How the "Wer bekommt was?" matrix reflects invoice mode.
//
// The matrix shows what the admin has CHOSEN, so switching invoice mode on turns
// every payer's cell into "Rechnung" straight away — even while issuer data is
// incomplete or ITC1's authority is missing. Until invoice mode is really active
// the server keeps sending statements (billing.ts resolveIssuer), and the matrix
// says so instead of silently showing the old documents.
export type InvoiceState = 'off' | 'incomplete' | 'unauthorized' | 'active'

export interface MatrixMode {
  showInvoices: boolean
  // German explanation when invoices are chosen but not yet sent; null otherwise.
  pendingNotice: string | null
}

export function matrixMode(state: InvoiceState, missing: readonly string[] = []): MatrixMode {
  if (state === 'off') return { showInvoices: false, pendingNotice: null }
  if (state === 'active') return { showInvoices: true, pendingNotice: null }
  const reason = state === 'incomplete'
    ? `die Ausstellerdaten unvollständig sind${missing.length ? ` (es fehlen: ${missing.join(', ')})` : ''}`
    : 'die schriftliche Vollmacht von ITC1 noch nicht hinterlegt ist'
  return {
    showInvoices: true,
    pendingNotice: `So sieht es mit Rechnungen aus. Noch nicht aktiv, weil ${reason} – bis dahin werden weiter Aufstellungen versendet.`,
  }
}
