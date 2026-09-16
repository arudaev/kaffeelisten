import { describe, expect, it } from 'vitest'
import {
  archiveEntries,
  countMissingFiles,
  documentFileStem,
  sanitizeFile,
  type IssuedDoc,
} from '../api/_lib/archive'

function doc(o: Partial<IssuedDoc>): IssuedDoc {
  return {
    kind: 'member_statement', reportMonth: '2026-08',
    companyId: 'c0ffee00-0000-0000-0000-000000000001', companyName: 'EFCO',
    memberId: 'aaaaaaaa-1111-0000-0000-000000000000', documentNumber: null,
    recipientName: 'Anna Keller', recipientEmail: 'anna@efco.de',
    netCents: null, taxCents: null, grossCents: 150,
    pdf: Buffer.from('%PDF'), xlsx: Buffer.from('PK'),
    ...o,
  }
}

describe('archiveEntries', () => {
  it('keeps a delivered document in the manifest even when its PDF failed, flagged', () => {
    const { files, manifest } = archiveEntries([
      doc({ memberId: 'aaaaaaaa-1' }),
      doc({ memberId: 'bbbbbbbb-2', recipientName: 'Ben', pdf: null }),
    ])
    expect(manifest).toHaveLength(2)
    expect(manifest[1].pdfFile).toBeNull()
    expect(manifest[1].xlsxFile).not.toBeNull()
    // The Excel of the document whose PDF failed is still archived.
    expect(files.filter(f => f.name.endsWith('.xlsx'))).toHaveLength(2)
    expect(files.filter(f => f.name.endsWith('.pdf'))).toHaveLength(1)
  })

  it('gives every member statement its own file — they used to overwrite each other', () => {
    const docs = [
      doc({ memberId: 'aaaaaaaa-1', recipientName: 'Anna' }),
      doc({ memberId: 'bbbbbbbb-2', recipientName: 'Ben' }),
      doc({ memberId: 'cccccccc-3', recipientName: 'Cara' }),
    ]
    const names = archiveEntries(docs).files.map(f => f.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toHaveLength(6)
  })

  it('separates two people with the same name', () => {
    const names = archiveEntries([
      doc({ memberId: 'aaaaaaaa-1', recipientName: 'Max' }),
      doc({ memberId: 'bbbbbbbb-2', recipientName: 'Max' }),
    ]).files.map(f => f.name)
    expect(new Set(names).size).toBe(4)
  })

  it('never drops a file on a stem collision', () => {
    const same = doc({})
    const names = archiveEntries([same, { ...same }]).files.map(f => f.name)
    expect(new Set(names).size).toBe(4)
  })

  it('files people and companies into separate folders', () => {
    const names = archiveEntries([
      doc({}),
      doc({ kind: 'company_invoice', memberId: null, documentNumber: 'K-000007' }),
    ]).files.map(f => f.name)
    expect(names.some(n => n.startsWith('Personen/'))).toBe(true)
    expect(names).toContain('Unternehmen/Rechnung-K-000007.pdf')
  })
})

describe('documentFileStem', () => {
  it('names an invoice by its number', () => {
    expect(documentFileStem(doc({ kind: 'member_invoice', documentNumber: 'K-000042' }))).toBe('Rechnung-K-000042')
  })

  it('names an information copy distinctly from a statement', () => {
    expect(documentFileStem(doc({ kind: 'member_info' }))).toMatch(/^Information-/)
  })
})

describe('sanitizeFile', () => {
  it('transliterates German letters instead of mangling them', () => {
    expect(sanitizeFile('Göttinger Straßburger Müller')).toBe('Goettinger_Strassburger_Mueller')
  })

  it('strips path separators so a name cannot escape its zip folder', () => {
    expect(sanitizeFile('../../etc/passwd')).not.toContain('/')
  })

  it('never returns an empty name', () => {
    expect(sanitizeFile('///')).toBe('dokument')
  })
})

describe('countMissingFiles', () => {
  it('counts invoices lacking each file type', () => {
    const inv = (o: Partial<IssuedDoc>) => doc({ kind: 'member_invoice', documentNumber: 'K-1', ...o })
    expect(countMissingFiles([inv({ pdf: null }), inv({ pdf: null, xlsx: null }), inv({})])).toEqual({ pdf: 2, xlsx: 1 })
  })

  it('never counts an email-only statement or information copy as missing files', () => {
    expect(countMissingFiles([
      doc({ kind: 'member_statement', pdf: null, xlsx: null }),
      doc({ kind: 'member_info', pdf: null, xlsx: null }),
      doc({ kind: 'company_statement', memberId: null, pdf: null, xlsx: null }),
    ])).toEqual({ pdf: 0, xlsx: 0 })
  })

  it('marks email-only documents in the manifest instead of flagging them as missing', () => {
    const { manifest } = archiveEntries([doc({ kind: 'member_statement', pdf: null, xlsx: null }), doc({ kind: 'member_invoice', documentNumber: 'K-2', pdf: null })])
    expect(manifest.map(m => m.attachmentsExpected)).toEqual([false, true])
  })
})
