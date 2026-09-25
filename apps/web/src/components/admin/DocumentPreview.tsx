import { useEffect, useState } from 'react'
import Tabs from './Tabs'
import AdminButton from './AdminButton'

// Preview of one document from the "Wer bekommt was?" matrix in all three forms
// a recipient gets: the email, the attached PDF and the attached Excel file.
// The email loads immediately; the PDF (Chromium on the server) and the Excel
// preview load only when their tab is opened.

type View = 'email' | 'pdf' | 'excel'

export interface PreviewSheet {
  name: string
  rows: string[][]
  totalRows: number
}

interface Props {
  // The /api/admin/preview-report request body, without `output`.
  request: Record<string, unknown>
  // Invoices and the administration report carry a PDF and an Excel. Every other
  // document is email only, so its preview is just the email.
  withAttachments: boolean
  onError: (message: string) => void
}

async function post(request: Record<string, unknown>, output: string): Promise<Response> {
  const res = await fetch('/api/admin/preview-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, output }),
  })
  if (!res.ok) {
    let message = 'Vorschau konnte nicht erstellt werden.'
    try { message = ((await res.json()) as { error?: string }).error ?? message } catch { /* keep default */ }
    throw new Error(message)
  }
  return res
}

export default function DocumentPreview({ request, withAttachments, onError }: Props) {
  const [view, setView] = useState<View>('email')
  const [email, setEmail] = useState<{ subject: string; html: string } | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [sheets, setSheets] = useState<PreviewSheet[] | null>(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [busy, setBusy] = useState<View | 'download' | null>('email')

  useEffect(() => {
    let cancelled = false
    post(request, 'html')
      .then(r => r.json() as Promise<{ subject: string; html: string }>)
      .then(d => { if (!cancelled) setEmail(d) })
      .catch(err => onError(err instanceof Error ? err.message : 'Vorschau konnte nicht geladen werden.'))
      .finally(() => { if (!cancelled) setBusy(null) })
    return () => { cancelled = true }
  }, [request, onError])

  // Release the PDF blob when the preview closes.
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl) }, [pdfUrl])

  const open = async (next: View) => {
    setView(next)
    try {
      if (next === 'pdf' && !pdfUrl) {
        setBusy('pdf')
        const blob = await (await post(request, 'pdf')).blob()
        setPdfUrl(URL.createObjectURL(blob))
      }
      if (next === 'excel' && !sheets) {
        setBusy('excel')
        const d = (await (await post(request, 'sheets')).json()) as { sheets: PreviewSheet[] }
        setSheets(d.sheets)
        setSheetIndex(0)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Vorschau konnte nicht erstellt werden.')
    } finally {
      setBusy(null)
    }
  }

  const downloadExcel = async () => {
    setBusy('download')
    try {
      const res = await post(request, 'xlsx')
      const filename = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'Vorschau.xlsx'
      const href = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = href
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Download fehlgeschlagen.')
    } finally {
      setBusy(null)
    }
  }

  const loading = (label: string) => (
    <div className="h-[60vh] flex items-center justify-center text-sm text-fg-muted">{label}</div>
  )
  const sheet = sheets?.[sheetIndex]

  const emailView = (
    <div className="flex flex-col gap-3">
      <p className="text-sm"><span className="text-fg-muted">Betreff:</span> <span className="text-fg">{email?.subject || '—'}</span></p>
      {!email ? loading('E-Mail wird geladen…') : (
        // No sandbox allowances: the document renders, but nothing in it can run.
        <iframe title="E-Mail-Vorschau" srcDoc={email.html} sandbox="" className="w-full h-[60vh] rounded-lg border border-border bg-white" />
      )}
    </div>
  )

  if (!withAttachments) {
    return (
      <div className="flex flex-col gap-3">
        {emailView}
        <p className="text-xs text-fg-muted">Wird nur als E-Mail versendet – ohne PDF- oder Excel-Anhang.</p>
      </div>
    )
  }

  return (
    <Tabs<View>
      ariaLabel="Vorschau-Format"
      active={view}
      onChange={open}
      tabs={[
        { id: 'email', label: 'E-Mail' },
        { id: 'pdf', label: 'PDF-Anhang' },
        { id: 'excel', label: 'Excel-Anhang' },
      ]}
    >
      {view === 'email' && emailView}

      {view === 'pdf' && (
        busy === 'pdf' || !pdfUrl ? loading('PDF wird erstellt… (einige Sekunden)') : (
          <div className="flex flex-col gap-2">
            <iframe title="PDF-Vorschau" src={pdfUrl} className="w-full h-[60vh] rounded-lg border border-border bg-white" />
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="self-start text-sm font-medium text-accent hover:underline">
              PDF in neuem Tab öffnen
            </a>
          </div>
        )
      )}

      {view === 'excel' && (
        busy === 'excel' || !sheets ? loading('Excel-Datei wird erstellt…') : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {sheets.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSheetIndex(i)}
                  aria-pressed={i === sheetIndex}
                  className={[
                    'h-8 px-3 rounded-md border text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    i === sheetIndex ? 'bg-accent-subtle border-accent text-fg font-medium' : 'border-border text-fg-muted hover:text-fg',
                  ].join(' ')}
                >
                  {s.name}
                </button>
              ))}
              <span className="flex-1" />
              <AdminButton variant="secondary" onClick={downloadExcel} disabled={busy === 'download'}>
                {busy === 'download' ? 'Wird erstellt…' : 'Excel herunterladen'}
              </AdminButton>
            </div>
            {sheet && (
              <div className="max-h-[55vh] overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    {sheet.rows.map((row, r) => (
                      <tr key={r} className={r === 0 ? 'bg-surface-2 font-semibold text-fg' : 'text-fg'}>
                        {row.map((cell, c) => (
                          <td key={c} className="px-3 py-1.5 border-b border-border whitespace-nowrap">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {sheet && sheet.totalRows > sheet.rows.length && (
              <p className="text-xs text-fg-muted">
                Zeigt die ersten {sheet.rows.length} von {sheet.totalRows} Zeilen. Die Datei selbst enthält alle.
              </p>
            )}
          </div>
        )
      )}
    </Tabs>
  )
}
