import { describe, expect, it } from 'vitest'
import {
  splitVat,
  formatDocumentNumber,
  resolveIssuer,
  toInvoiceRender,
  type IssuerRow,
} from '../api/_lib/billing'

const completeRow: IssuerRow = {
  issue_invoices: true,
  issuer_legal_name: 'ITC Innovations Technologie Campus GmbH',
  issuer_address: 'Ulrichsberger Str. 17\n94469 Deggendorf',
  issuer_vat_id: 'DE207285819',
  issuer_iban: 'DE33741500000380009340',
  issuer_bic: 'BYLADEM1DEG',
  invoice_number_prefix: 'K-',
  invoice_payment_terms: 'Zahlung ohne Abzug innerhalb 14 Tagen',
  invoice_vat_rate: 19,
}

describe('splitVat', () => {
  it('splits a gross amount into net + VAT that sum back to gross', () => {
    const s = splitVat(810, 19)
    expect(s.grossCents).toBe(810)
    expect(s.netCents + s.taxCents).toBe(810)
    // 810 / 1.19 = 680.67 → 681 net, 129 VAT
    expect(s.netCents).toBe(681)
    expect(s.taxCents).toBe(129)
  })

  it('handles a 0% rate (net == gross, no VAT)', () => {
    const s = splitVat(500, 0)
    expect(s.netCents).toBe(500)
    expect(s.taxCents).toBe(0)
  })

  it('never loses a cent to rounding', () => {
    for (const gross of [1, 7, 99, 250, 1337, 99999]) {
      const s = splitVat(gross, 19)
      expect(s.netCents + s.taxCents).toBe(gross)
    }
  })
})

describe('formatDocumentNumber', () => {
  it('zero-pads the running number and applies the prefix', () => {
    expect(formatDocumentNumber('K-', 42)).toBe('K-000042')
    expect(formatDocumentNumber('', 1)).toBe('000001')
    expect(formatDocumentNumber('KL-2026-', 12345)).toBe('KL-2026-012345')
  })
})

describe('resolveIssuer', () => {
  it('returns null when invoice mode is off', () => {
    expect(resolveIssuer({ ...completeRow, issue_invoices: false })).toBeNull()
  })

  it('returns null when a mandatory field is missing', () => {
    expect(resolveIssuer({ ...completeRow, issuer_iban: null })).toBeNull()
    expect(resolveIssuer({ ...completeRow, issuer_vat_id: null })).toBeNull()
    expect(resolveIssuer({ ...completeRow, issuer_bic: null })).toBeNull()
    expect(resolveIssuer({ ...completeRow, issuer_legal_name: null })).toBeNull()
  })

  it('returns null on nullish input', () => {
    expect(resolveIssuer(null)).toBeNull()
    expect(resolveIssuer(undefined)).toBeNull()
  })

  it('resolves a complete row (prefix defaults to empty string)', () => {
    const issuer = resolveIssuer(completeRow)
    expect(issuer).not.toBeNull()
    expect(issuer!.legalName).toBe('ITC Innovations Technologie Campus GmbH')
    expect(issuer!.iban).toBe('DE33741500000380009340')
    expect(issuer!.vatRate).toBe(19)
    expect(resolveIssuer({ ...completeRow, invoice_number_prefix: null })!.numberPrefix).toBe('')
  })
})

describe('toInvoiceRender', () => {
  it('carries the issuer, document number and VAT split into the render model', () => {
    const issuer = resolveIssuer(completeRow)!
    const split = splitVat(810, 19)
    const render = toInvoiceRender(issuer, 'K-000042', split)
    expect(render.documentNumber).toBe('K-000042')
    expect(render.issuerIban).toBe('DE33741500000380009340')
    expect(render.netCents).toBe(split.netCents)
    expect(render.taxCents).toBe(split.taxCents)
    expect(render.grossCents).toBe(810)
  })
})
