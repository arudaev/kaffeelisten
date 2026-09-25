import { describe, expect, it } from 'vitest'
import { matrixMode } from '../src/lib/invoiceMatrix'

describe('Wer bekommt was? matrix and invoice mode', () => {
  it('shows statements while invoice mode is off', () => {
    expect(matrixMode('off')).toEqual({ showInvoices: false, pendingNotice: null })
  })

  it('switches every payer to invoices as soon as invoice mode is chosen, even if incomplete', () => {
    const m = matrixMode('incomplete', ['IBAN', 'BIC'])
    expect(m.showInvoices).toBe(true)
    expect(m.pendingNotice).toMatch(/weil die Ausstellerdaten unvollständig sind \(es fehlen: IBAN, BIC\)/)
    expect(m.pendingNotice).toMatch(/weiter Aufstellungen versendet/)
  })

  it('explains a missing authority', () => {
    expect(matrixMode('unauthorized').pendingNotice).toMatch(/Vollmacht/)
  })

  it('has no notice once active', () => {
    expect(matrixMode('active')).toEqual({ showInvoices: true, pendingNotice: null })
  })
})
