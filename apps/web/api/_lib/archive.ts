// The month's issued documents, and the archive built from them.
//
// Every document actually delivered is collected here — invoice or statement,
// with or without a PDF — so the CEO archive holds exact copies of what went out
// and a manifest of all of it. Two failures this replaces:
//
//   • A document was only collected when its PDF rendered. If the PDF budget ran
//     out, the email still went out but the document vanished from the company
//     archive, the CEO archive and the ledger — while billing_documents still
//     recorded it as sent. Now a missing file is listed and flagged.
//   • Every member statement was named "Kaffeeliste-<month>.pdf", so inside one
//     zip they overwrote each other and only one survived. Names are now unique.

import { carriesAttachments, type CompanyDocKind, type MemberDocKind } from './documentMatrix'
import type { ManifestRow } from './excel'

export type IssuedDocKind = MemberDocKind | CompanyDocKind

export interface IssuedDoc {
  kind: IssuedDocKind
  reportMonth: string
  companyId: string
  companyName: string
  memberId: string | null         // null → a company document
  documentNumber: string | null   // null → not an invoice
  recipientName: string
  recipientEmail: string
  netCents: number | null
  taxCents: number | null
  grossCents: number
  pdf: Buffer | null              // null → not rendered (failed, or an email-only document)
  xlsx: Buffer | null
}

export const KIND_LABELS: Record<IssuedDocKind, string> = {
  member_invoice: 'Rechnung (Person)',
  member_statement: 'Aufstellung (Person)',
  member_info: 'Information (Person, Firma zahlt)',
  company_invoice: 'Rechnung (Unternehmen)',
  company_statement: 'Aufstellung (Unternehmen)',
}

// Filesystem- and zip-safe. Keeps word characters, dot and dash; transliterates
// German letters so "Göttinger" stays readable instead of becoming "G_ttinger".
export function sanitizeFile(s: string): string {
  const transliterated = s
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
  return (
    transliterated.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 80) ||
    'dokument'
  )
}

const KIND_FILE_PREFIX: Record<IssuedDocKind, string> = {
  member_invoice: 'Rechnung',
  member_statement: 'Aufstellung',
  member_info: 'Information',
  company_invoice: 'Rechnung',
  company_statement: 'Aufstellung',
}

/**
 * A file stem unique within one month's archive.
 *
 * An invoice is identified by its number, which is unique by construction. Any
 * other document is identified by who it is for — and because two people can
 * share a name, a short prefix of their id is always appended.
 */
export function documentFileStem(doc: IssuedDoc): string {
  const prefix = KIND_FILE_PREFIX[doc.kind]
  if (doc.documentNumber) return `${prefix}-${sanitizeFile(doc.documentNumber)}`
  const subjectId = (doc.memberId ?? doc.companyId).replace(/-/g, '').slice(0, 8)
  const who = doc.memberId ? doc.recipientName : doc.companyName
  return `${prefix}-${sanitizeFile(who)}-${subjectId}-${doc.reportMonth}`
}

export interface ArchiveFile {
  name: string
  content: Buffer
}

/**
 * Files for an archive zip — each document's PDF and Excel under a unique name —
 * plus manifest rows for every document, including those missing a file.
 * `folder` groups files inside the zip ("Personen/", "Unternehmen/").
 */
export function archiveEntries(docs: readonly IssuedDoc[]): { files: ArchiveFile[]; manifest: ManifestRow[] } {
  const files: ArchiveFile[] = []
  const manifest: ManifestRow[] = []
  const used = new Set<string>()

  // Belt and braces: the stems are designed to be unique, but a collision must
  // never silently drop a file from a legal archive.
  const claim = (name: string): string => {
    if (!used.has(name)) {
      used.add(name)
      return name
    }
    const dot = name.lastIndexOf('.')
    for (let n = 2; ; n++) {
      const candidate = `${name.slice(0, dot)}-${n}${name.slice(dot)}`
      if (!used.has(candidate)) {
        used.add(candidate)
        return candidate
      }
    }
  }

  for (const doc of docs) {
    const folder = doc.memberId ? 'Personen' : 'Unternehmen'
    const stem = `${folder}/${documentFileStem(doc)}`
    const pdfFile = doc.pdf ? claim(`${stem}.pdf`) : null
    const xlsxFile = doc.xlsx ? claim(`${stem}.xlsx`) : null
    if (doc.pdf && pdfFile) files.push({ name: pdfFile, content: doc.pdf })
    if (doc.xlsx && xlsxFile) files.push({ name: xlsxFile, content: doc.xlsx })
    manifest.push({
      kindLabel: KIND_LABELS[doc.kind],
      documentNumber: doc.documentNumber,
      recipientName: doc.recipientName,
      recipientEmail: doc.recipientEmail,
      companyName: doc.companyName,
      netCents: doc.netCents,
      taxCents: doc.taxCents,
      grossCents: doc.grossCents,
      pdfFile,
      xlsxFile,
      attachmentsExpected: carriesAttachments(doc.kind),
    })
  }
  return { files, manifest }
}

/** How many invoices went out missing a file, for the run result. Email-only documents never count. */
export function countMissingFiles(docs: readonly IssuedDoc[]): { pdf: number; xlsx: number } {
  const withFiles = docs.filter(d => carriesAttachments(d.kind))
  return {
    pdf: withFiles.filter(d => !d.pdf).length,
    xlsx: withFiles.filter(d => !d.xlsx).length,
  }
}
