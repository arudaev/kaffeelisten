import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import AdminButton from './AdminButton'
import AdminIcon from './AdminIcon'
import { adminApi } from '../../lib/adminApi'
import { monthLabel } from '../../lib/dates'
import { formatEuro } from '../../lib/money'
import {
  progressPercent,
  type DeliveryState,
  type ReportProgress,
  type RunPhase,
} from '../../../shared/reportProgress'

// The manual monthly send: confirm, then live progress while the run goes out,
// then the result with delivery status as Resend reports it.
//
// Every piece of text sits in its own element. Browser translation (Edge, Chrome)
// replaces bare text nodes, and React then crashes with "removeChild … not a child
// of this node" when it swaps the confirmation for the progress view (2026-09-17).

export interface SendResult {
  sent: number
  failed: number
  skipped: { recipient: 'member' | 'company'; name: string; reason: string }[]
  missingFiles: { pdf: number; xlsx: number }
}

export type SendStage = 'confirm' | 'running' | 'done' | 'failed'

const SKIP_REASON: Record<string, string> = {
  no_email: 'keine E-Mail-Adresse',
  no_billing_contact: 'kein Rechnungskontakt',
  unknown_company: 'Unternehmen fehlt',
  house_account: 'Firmen-Checkout',
}

const PHASE_LABEL: Record<RunPhase, string> = {
  preparing: 'Dokumente werden vorbereitet …',
  people: 'E-Mails an die Personen werden versendet …',
  companies: 'E-Mails an die Unternehmen werden versendet …',
  report: 'Bericht an die Verwaltung wird versendet …',
  archive: 'Archiv an die Geschäftsführung wird versendet …',
  finishing: 'Monat wird archiviert …',
  done: 'Alles versendet.',
  failed: 'Der Versand wurde abgebrochen.',
}

const DELIVERY_LABEL: Record<DeliveryState, string> = {
  pending: 'wartet auf Rückmeldung',
  delivered: 'zugestellt',
  delayed: 'verzögert',
  bounced: 'unzustellbar',
  complained: 'als Spam gemeldet',
  failed: 'fehlgeschlagen',
  blocked: 'vom Staging-Mailschutz zurückgehalten',
}

// ── Presentational view (no fetching; rendered directly by the tests) ──────────

export interface ReportSendViewProps {
  open: boolean
  stage: SendStage
  month: string
  entryCount: number
  totalCents: number
  progress: ReportProgress | null
  result: SendResult | null
  error: string | null
  onSend: () => void
  onClose: () => void
  onOpenDocuments: () => void
}

function Row({ label, hint, value }: { label: string; hint?: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-border last:border-b-0">
      <span className="text-fg">
        <span>{label}</span>
        {hint && <span className="text-fg-subtle text-xs"> {hint}</span>}
      </span>
      <span className="font-mono tabular-nums text-fg whitespace-nowrap">{value}</span>
    </div>
  )
}

function ProgressDetails({ progress, stage }: { progress: ReportProgress; stage: SendStage }) {
  const percent = progressPercent(progress)
  const { documents, report, archive, delivery } = progress
  const emailsSent = progress.total.sent
  const deliveredOrFinal = delivery.delivered + delivery.bounced + delivery.complained + delivery.failed + delivery.blocked
  const undeliverable = delivery.bounced + delivery.complained + delivery.failed
  const phase = progress.phase ?? (stage === 'running' ? 'preparing' : 'done')

  return (
    <div className="flex flex-col gap-4 text-fg">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-medium">{PHASE_LABEL[phase]}</span>
          <span className="font-mono tabular-nums text-fg-muted">{`${emailsSent} von ${progress.total.planned}`}</span>
        </div>
        <progress
          aria-label="Fortschritt des Versands"
          max={100}
          value={percent}
          className={[
            'w-full h-2 rounded-full overflow-hidden appearance-none bg-surface-2',
            '[&::-webkit-progress-bar]:bg-surface-2 [&::-webkit-progress-value]:bg-accent',
            '[&::-webkit-progress-value]:transition-all [&::-moz-progress-bar]:bg-accent',
          ].join(' ')}
        />
      </div>

      <div className="flex flex-col">
        <Row label="Rechnungen" hint="mit PDF und Excel" value={`${documents.invoice.sent} / ${documents.invoice.planned}`} />
        <Row label="Aufstellungen" hint="nur E-Mail" value={`${documents.statement.sent} / ${documents.statement.planned}`} />
        <Row label="Informationen" hint="nur E-Mail" value={`${documents.info.sent} / ${documents.info.planned}`} />
        <Row label="Bericht an die Verwaltung" hint="mit PDF und Excel" value={report.sent ? 'versendet' : 'ausstehend'} />
        {archive.planned && (
          <Row label="Archiv an die Geschäftsführung" hint="ZIP" value={archive.sent ? 'versendet' : 'ausstehend'} />
        )}
        {progress.failed > 0 && <Row label="Fehlgeschlagen" value={String(progress.failed)} />}
      </div>

      <div className="rounded-lg bg-surface-2 px-3 py-2 flex flex-col gap-1">
        <p className="flex items-baseline justify-between gap-4">
          <span className="font-medium">Zugestellt</span>
          <span className="font-mono tabular-nums">{`${delivery.delivered} von ${emailsSent}`}</span>
        </p>
        {undeliverable > 0 && (
          <p className="text-error text-xs"><span>{`${undeliverable} unzustellbar – Details unter „Dokumente“.`}</span></p>
        )}
        {delivery.blocked > 0 && (
          <p className="text-fg-muted text-xs">
            <span>{`${delivery.blocked} nicht versendet: Empfänger außerhalb von MAIL_ALLOWLIST (Staging-Mailschutz).`}</span>
          </p>
        )}
        {delivery.delayed > 0 && (
          <p className="text-fg-muted text-xs"><span>{`${delivery.delayed} verzögert, Resend versucht es weiter.`}</span></p>
        )}
        {emailsSent > deliveredOrFinal && (
          <p className="text-fg-subtle text-xs"><span>Resend meldet die Zustellung meist nach wenigen Sekunden.</span></p>
        )}
        {report.sent && (
          <p className="text-fg-subtle text-xs"><span>{`Bericht an die Verwaltung: ${DELIVERY_LABEL[report.delivery]}`}</span></p>
        )}
      </div>
    </div>
  )
}

export function ReportSendView(props: ReportSendViewProps) {
  const { open, stage, month, entryCount, totalCents, progress, result, error, onSend, onClose, onOpenDocuments } = props

  const title =
    stage === 'confirm' ? 'Monatsbericht senden'
    : stage === 'running' ? 'Monatsversand läuft'
    : stage === 'done' ? 'Monatsversand abgeschlossen'
    : 'Monatsversand fehlgeschlagen'

  const actions =
    stage === 'confirm' ? (
      <div key="confirm" className="flex flex-wrap justify-end gap-2">
        <AdminButton variant="secondary" onClick={onClose}>Abbrechen</AdminButton>
        <AdminButton onClick={onSend} icon={<AdminIcon name="send" size={16} />}>Senden</AdminButton>
      </div>
    ) : stage === 'running' ? (
      <div key="running" className="flex flex-wrap justify-end gap-2">
        <AdminButton variant="secondary" onClick={onClose}>Schließen</AdminButton>
      </div>
    ) : (
      <div key="finished" className="flex flex-wrap justify-end gap-2">
        <AdminButton variant="secondary" onClick={onOpenDocuments}>Dokumente ansehen</AdminButton>
        <AdminButton onClick={onClose}>Schließen</AdminButton>
      </div>
    )

  return (
    <Modal open={open} onClose={onClose} title={title} actions={actions}>
      {stage === 'confirm' ? (
        <div key="confirm" className="flex flex-col gap-2">
          <p>
            <span>Der Versand für </span>
            <strong className="text-fg">{monthLabel(month)}</strong>
            <span>{` (${entryCount} Einträge, ${formatEuro(totalCents)}) geht an alle Personen, Unternehmen, die Verwaltung und die Geschäftsführung.`}</span>
          </p>
          <p><span>Nur Rechnungen haben PDF- und Excel-Anhänge. Die Einträge bleiben erhalten.</span></p>
        </div>
      ) : (
        <div key="progress" className="flex flex-col gap-4">
          {progress ? (
            <ProgressDetails progress={progress} stage={stage} />
          ) : (
            <p><span>Der Versand wird gestartet …</span></p>
          )}
          {stage === 'running' && (
            <p className="text-xs text-fg-subtle"><span>Das Fenster kann geschlossen werden – der Versand läuft weiter.</span></p>
          )}
          {stage === 'failed' && error && (
            <p className="text-error"><span>{error}</span></p>
          )}
          {result && (result.missingFiles.pdf > 0 || result.missingFiles.xlsx > 0) && (
            <p className="text-error text-sm">
              <span>{`Ohne Anhang versendet: ${result.missingFiles.pdf} × PDF, ${result.missingFiles.xlsx} × Excel. Unter „Dokumente“ lassen sie sich einzeln erneut senden.`}</span>
            </p>
          )}
          {result && result.skipped.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-fg"><span>{`Nicht zustellbar (${result.skipped.length}):`}</span></p>
              <ul className="list-disc pl-5 mt-1 text-fg-muted">
                {result.skipped.slice(0, 8).map((s, i) => (
                  <li key={i}><span>{`${s.name} – ${SKIP_REASON[s.reason] ?? s.reason}`}</span></li>
                ))}
                {result.skipped.length > 8 && <li><span>{`und ${result.skipped.length - 8} weitere`}</span></li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Stateful dialog ───────────────────────────────────────────────────────────

const POLL_RUNNING_MS = 1500
const POLL_DELIVERY_MS = 4000
// After the run, keep asking for delivery status for this long while the dialog is open.
const DELIVERY_WATCH_MS = 3 * 60 * 1000

interface ReportSendDialogProps {
  open: boolean
  month: string
  entryCount: number
  totalCents: number
  onClose: () => void
  onOpenDocuments: () => void
  onToast: (message: string) => void
}

export default function ReportSendDialog({ open, month, entryCount, totalCents, onClose, onOpenDocuments, onToast }: ReportSendDialogProps) {
  const [stage, setStage] = useState<SendStage>('confirm')
  const [progress, setProgress] = useState<ReportProgress | null>(null)
  const [result, setResult] = useState<SendResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The start time of the month's previous run, so its counts are not shown as this run's.
  const baselineStart = useRef<string | null>(null)
  const finishedAt = useRef<number | null>(null)

  const refresh = useCallback(async (): Promise<ReportProgress | null> => {
    try {
      const p = await adminApi.getReportProgress(month)
      const isThisRun = p.status === 'running' || (p.startedAt !== null && p.startedAt !== baselineStart.current)
      if (isThisRun) setProgress(p)
      return isThisRun ? p : null
    } catch {
      return null // progress is a convenience; the send itself reports errors
    }
  }, [month])

  // Opening the dialog: if a run for this month is already under way (the cron, or
  // another tab), show it instead of offering to send again.
  useEffect(() => {
    if (!open) return
    setStage('confirm')
    setProgress(null)
    setResult(null)
    setError(null)
    finishedAt.current = null
    let cancelled = false
    adminApi.getReportProgress(month)
      .then(p => {
        if (cancelled) return
        baselineStart.current = p.status === 'running' ? null : p.startedAt
        if (p.status === 'running') {
          setProgress(p)
          setStage('running')
        }
      })
      .catch(() => { baselineStart.current = null })
    return () => { cancelled = true }
  }, [open, month])

  // Poll while running, then for delivery status for a while.
  useEffect(() => {
    if (!open || stage === 'confirm') return
    const watching = stage === 'running' || finishedAt.current === null || Date.now() - finishedAt.current < DELIVERY_WATCH_MS
    if (!watching) return
    const timer = setInterval(async () => {
      const p = await refresh()
      if (stage === 'running' && p && p.status !== 'running' && !result) {
        // The run ended without this tab's request answering (closed tab, dropped connection).
        finishedAt.current = Date.now()
        setStage(p.status === 'failed' ? 'failed' : 'done')
        if (p.error) setError(p.error)
      }
      if (stage !== 'running' && finishedAt.current !== null && Date.now() - finishedAt.current >= DELIVERY_WATCH_MS) {
        clearInterval(timer)
      }
    }, stage === 'running' ? POLL_RUNNING_MS : POLL_DELIVERY_MS)
    return () => clearInterval(timer)
  }, [open, stage, refresh, result])

  const send = async () => {
    setStage('running')
    setError(null)
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = body?.error ? `Fehler beim Senden: ${body.error}` : 'Fehler beim Senden. Bitte erneut versuchen.'
        finishedAt.current = Date.now()
        setError(message)
        setStage('failed')
        await refresh()
        return
      }
      if (body.status === 'skipped') {
        // Another run holds the lock: follow that one.
        onToast('Für diesen Monat läuft bereits ein Versand – der Fortschritt wird angezeigt.')
        baselineStart.current = null
        await refresh()
        return
      }
      setResult({
        sent: body.memberStatements?.sent ?? 0,
        failed: body.memberStatements?.failed ?? 0,
        skipped: body.skipped ?? [],
        missingFiles: body.missingFiles ?? { pdf: 0, xlsx: 0 },
      })
      finishedAt.current = Date.now()
      await refresh()
      setStage('done')
    } catch {
      // The connection dropped; the run may well still be going on the server.
      const p = await refresh()
      if (!p || p.status !== 'running') {
        finishedAt.current = Date.now()
        setError('Die Verbindung wurde unterbrochen. Unter „Dokumente“ ist zu sehen, was bereits versendet wurde.')
        setStage(p?.status === 'completed' ? 'done' : 'failed')
      }
    }
  }

  return (
    <ReportSendView
      open={open}
      stage={stage}
      month={month}
      entryCount={entryCount}
      totalCents={totalCents}
      progress={progress}
      result={result}
      error={error}
      onSend={send}
      onClose={onClose}
      onOpenDocuments={onOpenDocuments}
    />
  )
}
