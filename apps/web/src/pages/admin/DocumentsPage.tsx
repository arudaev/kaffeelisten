import { useCallback, useEffect, useMemo, useState } from 'react'
import { Topbar } from '../../components/admin/Topbar'
import DataTable, { Column } from '../../components/admin/DataTable'
import AdminButton from '../../components/admin/AdminButton'
import AdminIcon from '../../components/admin/AdminIcon'
import AdminSelect from '../../components/admin/AdminSelect'
import Badge from '../../components/admin/Badge'
import Modal from '../../components/admin/Modal'
import Toggle from '../../components/admin/Toggle'
import SegmentedControl from '../../components/admin/SegmentedControl'
import FilterBar from '../../components/admin/FilterBar'
import { adminApi, type DeliveryKind, type DocumentDelivery } from '../../lib/adminApi'
import { monthLabel } from '../../lib/dates'
import { formatEuro as euro } from '../../lib/money'
import { needsAttention, resolvedByResend, summariseDeliveries } from '../../lib/deliveries'

const KIND_LABEL: Record<DeliveryKind, string> = {
  member_invoice: 'Rechnung',
  company_invoice: 'Rechnung',
  member_statement: 'Aufstellung',
  company_statement: 'Aufstellung',
  member_info: 'Information',
}

type KindFilter = 'all' | 'invoice' | 'statement' | 'info'

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'invoice', label: 'Rechnungen' },
  { value: 'statement', label: 'Aufstellungen' },
  { value: 'info', label: 'Informationen' },
]

function when(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

/**
 * Every document the monthly run delivered — invoices, statements and information
 * copies — with preview, download and re-send. Invoices also carry their paid
 * status here, which used to be buried at the bottom of the settings page.
 */
export default function DocumentsPage({ onToast, onMenuClick }: Props) {
  const [months, setMonths] = useState<string[]>([])
  const [month, setMonth] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<DocumentDelivery[]>([])
  const [paidByDoc, setPaidByDoc] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<KindFilter>('all')
  const [search, setSearch] = useState('')
  const [onlyProblems, setOnlyProblems] = useState(false)

  const [preview, setPreview] = useState<{ delivery: DocumentDelivery; subject: string; html: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState<string | null>(null)
  const [resendTarget, setResendTarget] = useState<DocumentDelivery | null>(null)
  const [resending, setResending] = useState(false)
  const [busyDownload, setBusyDownload] = useState<string | null>(null)

  const load = useCallback(async (m?: string) => {
    setLoading(true)
    try {
      const r = await adminApi.getDeliveries(m)
      setMonths(r.months)
      setMonth(r.month)
      setDeliveries(r.deliveries)
      if (r.month && r.deliveries.some(d => d.billing_document_id)) {
        const ledger = await adminApi.getBillingDocuments(r.month)
        setPaidByDoc(Object.fromEntries(ledger.documents.map(d => [d.id, d.paid])))
      } else {
        setPaidByDoc({})
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Dokumente konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [onToast])

  useEffect(() => { load() }, [load])

  // A document missing a file is resolved once a re-send delivered it complete.
  const resolved = useMemo(() => resolvedByResend(deliveries), [deliveries])
  const summary = useMemo(() => summariseDeliveries(deliveries), [deliveries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deliveries.filter(d =>
      (kind === 'all' || d.kind.includes(kind)) &&
      (!onlyProblems || needsAttention(d, resolved)) &&
      (!q || d.recipient_name.toLowerCase().includes(q) || d.company_name.toLowerCase().includes(q) || d.recipient_email.toLowerCase().includes(q) || (d.document_number ?? '').toLowerCase().includes(q)),
    )
  }, [deliveries, kind, search, onlyProblems, resolved])

  const problems = summary.unresolvedMissing
  const invoiceTotal = summary.invoiceTotalCents
  const invoiceCount = summary.invoices
  const unpaidInvoices = deliveries.filter(d => d.billing_document_id && !d.resend_of && paidByDoc[d.billing_document_id] === false).length

  const openPreview = async (d: DocumentDelivery) => {
    setPreviewLoading(d.id)
    try {
      const r = await adminApi.previewDelivery(d.id)
      setPreview({ delivery: d, ...r })
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Vorschau konnte nicht erstellt werden.')
    } finally {
      setPreviewLoading(null)
    }
  }

  const download = async (d: DocumentDelivery, as: 'pdf' | 'xlsx') => {
    setBusyDownload(`${d.id}-${as}`)
    try {
      await adminApi.downloadDelivery(d.id, as)
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Download fehlgeschlagen.')
    } finally {
      setBusyDownload(null)
    }
  }

  const resend = async () => {
    if (!resendTarget) return
    setResending(true)
    try {
      await adminApi.resendDelivery(resendTarget.id)
      onToast(`Erneut an ${resendTarget.recipient_email} gesendet.`)
      setResendTarget(null)
      load(month ?? undefined)
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Erneutes Senden fehlgeschlagen.')
    } finally {
      setResending(false)
    }
  }

  const togglePaid = async (billingDocumentId: string) => {
    const next = !paidByDoc[billingDocumentId]
    setPaidByDoc(p => ({ ...p, [billingDocumentId]: next }))
    try {
      await adminApi.setBillingPaid(billingDocumentId, next)
    } catch {
      setPaidByDoc(p => ({ ...p, [billingDocumentId]: !next }))
      onToast('Zahlungsstatus konnte nicht gespeichert werden.')
    }
  }

  const iconButton = 'text-fg-muted hover:text-accent p-1 rounded transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

  const columns: Column<DocumentDelivery>[] = [
    {
      key: 'kind',
      label: 'Dokument',
      sortValue: d => `${KIND_LABEL[d.kind]} ${d.document_number ?? ''}`,
      render: d => (
        <span className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-2">
            <Badge kind={d.kind.includes('invoice') ? 'warn' : d.kind === 'member_info' ? 'inactive' : 'verified'}>
              {KIND_LABEL[d.kind]}
            </Badge>
            {d.document_number && <span className="font-mono text-sm">{d.document_number}</span>}
          </span>
          <span className="text-xs text-fg-muted">{d.member_id ? `Person · ${d.company_name}` : d.company_name}{d.resend_of ? ' · erneut gesendet' : ''}</span>
        </span>
      ),
    },
    {
      key: 'recipient',
      label: 'Empfänger',
      sortValue: d => d.recipient_name,
      render: d => (
        <span className="flex flex-col">
          <span className="font-medium">{d.recipient_name}</span>
          <span className="text-xs text-fg-muted">{d.recipient_email}</span>
        </span>
      ),
    },
    { key: 'amount', label: 'Betrag', align: 'right', mono: true, sortValue: d => d.gross_cents, render: d => euro(d.gross_cents) },
    {
      key: 'files',
      label: 'Anhänge',
      sortValue: d => Number(d.has_pdf) + Number(d.has_xlsx),
      render: d =>
        d.has_pdf && d.has_xlsx ? (
          <span className="text-xs text-fg-muted">PDF · Excel</span>
        ) : resolved.has(d.id) ? (
          <span className="text-xs text-fg-muted">fehlte · erneut vollständig gesendet</span>
        ) : (
          <Badge kind="error">
            fehlt: {[!d.has_pdf && 'PDF', !d.has_xlsx && 'Excel'].filter(Boolean).join(', ')}
          </Badge>
        ),
    },
    {
      key: 'paid',
      label: 'Bezahlt',
      align: 'center',
      render: d =>
        d.billing_document_id && !d.resend_of ? (
          <Toggle
            checked={!!paidByDoc[d.billing_document_id]}
            onChange={() => togglePaid(d.billing_document_id!)}
            label={paidByDoc[d.billing_document_id] ? 'Bezahlt' : 'Offen'}
          />
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    { key: 'sent_at', label: 'Gesendet', mono: true, muted: true, sortValue: d => d.sent_at, render: d => when(d.sent_at) },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: d => (
        <div className="inline-flex gap-0.5">
          <button type="button" className={iconButton} onClick={() => openPreview(d)} disabled={previewLoading === d.id}
            title="Vorschau" aria-label={`Vorschau ${KIND_LABEL[d.kind]} für ${d.recipient_name}`}>
            <AdminIcon name="document" size={16} />
          </button>
          <button type="button" className={`${iconButton} text-xs font-semibold px-1.5`} onClick={() => download(d, 'pdf')} disabled={busyDownload === `${d.id}-pdf`}
            title="PDF herunterladen" aria-label={`PDF für ${d.recipient_name} herunterladen`}>
            PDF
          </button>
          <button type="button" className={`${iconButton} text-xs font-semibold px-1.5`} onClick={() => download(d, 'xlsx')} disabled={busyDownload === `${d.id}-xlsx`}
            title="Excel herunterladen" aria-label={`Excel für ${d.recipient_name} herunterladen`}>
            XLS
          </button>
          <button type="button" className={iconButton} onClick={() => setResendTarget(d)}
            title="Erneut senden" aria-label={`Erneut an ${d.recipient_name} senden`}>
            <AdminIcon name="send" size={16} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <Topbar
        title="Dokumente"
        eyebrow={month ? monthLabel(month) : 'Versandte Dokumente'}
        onMenuClick={onMenuClick}
        right={
          months.length > 0 ? (
            <AdminSelect
              variant="filter"
              aria-label="Abrechnungsmonat"
              value={month ?? ''}
              onChange={e => load(e.target.value)}
              options={months.map(m => ({ value: m, label: monthLabel(m) }))}
            />
          ) : undefined
        }
      />
      <div className="p-4 md:p-8 flex flex-col gap-4">
        {!loading && deliveries.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4">
              <span className="text-xs font-medium text-fg-muted">Dokumente</span>
              <p className="text-lg font-semibold text-fg">{summary.documents}</p>
              <span className="text-xs text-fg-muted">{summary.resends} erneut gesendet</span>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <span className="text-xs font-medium text-fg-muted">Rechnungen</span>
              <p className="text-lg font-semibold text-fg">{invoiceCount} · {euro(invoiceTotal)}</p>
              <span className="text-xs text-fg-muted">{invoiceCount === 0 ? 'Rechnungsmodus aus' : `${unpaidInvoices} offen`}</span>
            </div>
            <button
              type="button"
              onClick={() => setOnlyProblems(p => !p)}
              disabled={problems === 0}
              className={[
                'rounded-xl border p-4 text-left transition-colors disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                problems > 0 ? 'border-error bg-error-subtle hover:border-error' : 'border-border bg-surface',
                onlyProblems ? 'ring-2 ring-error' : '',
              ].join(' ')}
            >
              <span className="text-xs font-medium text-fg-muted">Fehlende Anhänge</span>
              <p className={['text-lg font-semibold', problems > 0 ? 'text-error' : 'text-fg'].join(' ')}>{problems}</p>
              <span className="text-xs text-fg-muted">
                {problems === 0 ? 'Alles vollständig' : onlyProblems ? 'Filter aktiv – klicken zum Aufheben' : 'Klicken zum Filtern'}
              </span>
            </button>
          </div>
        )}

        {deliveries.length > 0 && (
          <FilterBar
            search={{ value: search, onChange: setSearch, placeholder: 'Empfänger oder Rechnungsnr.…' }}
            trailing={<span className="text-sm text-fg-muted">{filtered.length} Dokumente</span>}
          >
            <SegmentedControl options={KIND_FILTERS} value={kind} onChange={setKind} ariaLabel="Dokumentart" size="sm" />
          </FilterBar>
        )}

        {loading ? (
          <div className="h-48 bg-surface-2 rounded-xl animate-pulse" />
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={d => d.id}
            defaultSort={{ key: 'sent_at', dir: 'desc' }}
            empty={
              deliveries.length === 0
                ? { title: 'Noch keine Dokumente versendet.', body: 'Nach dem ersten Monatsversand erscheint hier jede Rechnung, Aufstellung und Information – mit Vorschau, Download und erneutem Versand.' }
                : { title: 'Keine Treffer.', body: 'Passe die Filter an.' }
            }
          />
        )}
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        size="lg"
        title={preview ? `${KIND_LABEL[preview.delivery.kind]} · ${preview.delivery.recipient_name}` : 'Vorschau'}
        actions={
          preview && (
            <>
              <AdminButton variant="secondary" onClick={() => download(preview.delivery, 'pdf')}>PDF</AdminButton>
              <AdminButton variant="secondary" onClick={() => download(preview.delivery, 'xlsx')}>Excel</AdminButton>
              <AdminButton variant="ghost" onClick={() => setPreview(null)}>Schließen</AdminButton>
            </>
          )
        }
      >
        {preview && (
          <div className="flex flex-col gap-3">
            <p className="text-sm"><span className="text-fg-muted">Betreff:</span> <span className="text-fg">{preview.subject}</span></p>
            {preview.delivery.document_number && (
              <p className="text-xs text-fg-muted">
                Neu erzeugt aus dem Archiv: Rechnungsnummer und Beträge sind unverändert, die Ausstellerdaten entsprechen den aktuellen Einstellungen.
              </p>
            )}
            {/* sandbox with no allowances: the document renders, but nothing in it can run. */}
            <iframe title="Dokumentvorschau" sandbox="" srcDoc={preview.html} className="w-full h-[60vh] rounded-lg border border-border bg-white" />
          </div>
        )}
      </Modal>

      <Modal
        open={!!resendTarget}
        onClose={() => setResendTarget(null)}
        title="Dokument erneut senden?"
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setResendTarget(null)} disabled={resending}>Abbrechen</AdminButton>
            <AdminButton onClick={resend} disabled={resending} icon={<AdminIcon name="send" size={16} />}>
              {resending ? 'Wird gesendet…' : 'Erneut senden'}
            </AdminButton>
          </>
        }
      >
        {resendTarget && (
          <>
            {KIND_LABEL[resendTarget.kind]}{resendTarget.document_number ? ` ${resendTarget.document_number}` : ''} für{' '}
            <strong className="text-fg">{monthLabel(resendTarget.report_month)}</strong> geht erneut an{' '}
            <strong className="text-fg">{resendTarget.recipient_email}</strong>.
            {resendTarget.document_number && ' Die Rechnungsnummer bleibt dieselbe – es wird keine neue Rechnung ausgestellt.'}
          </>
        )}
      </Modal>
    </>
  )
}
