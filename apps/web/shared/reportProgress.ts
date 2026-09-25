// Live progress of the monthly run, shared by the API (api/_lib/report.ts writes
// it, api/admin/report-progress.ts summarises it) and the admin send dialog.
//
// The run stores its plan and phase on report_runs.progress (migration 040).
// Documents already sent are counted from document_deliveries, and delivery
// status comes from the Resend webhook's email_delivery_events.

export type RunPhase = 'preparing' | 'people' | 'companies' | 'report' | 'archive' | 'finishing' | 'done' | 'failed'

// Invoices carry the PDF and Excel; statements and information copies are email only.
export type DocGroup = 'invoice' | 'statement' | 'info'

// `blocked`: held back by the staging mail guard (api/_lib/mail.ts), never sent.
export type DeliveryState = 'pending' | 'delivered' | 'delayed' | 'bounced' | 'complained' | 'failed' | 'blocked'

// The id the staging mail guard returns for a message it did not send.
export const BLOCKED_MESSAGE_ID = 'blocked-by-mail-guard'

export const DELIVERY_EVENTS = ['delivered', 'delayed', 'bounced', 'complained', 'failed'] as const
export type DeliveryEvent = (typeof DELIVERY_EVENTS)[number]

export interface SingleEmailProgress {
  planned: boolean
  sent: boolean
  messageId: string | null
}

// What the run writes to report_runs.progress.
export interface StoredProgress {
  phase: RunPhase
  planned: Record<DocGroup, number>
  failed: number
  report: SingleEmailProgress
  archive: SingleEmailProgress
}

export function emptyProgress(): StoredProgress {
  return {
    phase: 'preparing',
    planned: { invoice: 0, statement: 0, info: 0 },
    failed: 0,
    report: { planned: true, sent: false, messageId: null },
    archive: { planned: false, sent: false, messageId: null },
  }
}

export function docGroup(kind: string): DocGroup {
  if (kind.endsWith('_invoice')) return 'invoice'
  if (kind.endsWith('_info')) return 'info'
  return 'statement'
}

export interface ProgressDelivery {
  kind: string
  resend_message_id: string | null
}

export interface ProgressEvent {
  resend_message_id: string
  event: string
  occurred_at: string
}

export interface ProgressRun {
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at: string | null
  last_error: string | null
  progress: unknown
}

export interface DocCount {
  planned: number
  sent: number
}

export interface ReportProgress {
  status: 'idle' | 'running' | 'completed' | 'failed'
  startedAt: string | null
  completedAt: string | null
  error: string | null
  phase: RunPhase | null
  documents: Record<DocGroup, DocCount>
  // Invoices, documents and the two single emails together.
  total: DocCount
  failed: number
  report: SingleEmailProgress & { delivery: DeliveryState }
  archive: SingleEmailProgress & { delivery: DeliveryState }
  // Over every email sent so far that has a Resend message id.
  delivery: Record<DeliveryState, number>
}

// A final outcome wins over a later "delayed"; "delivered" wins over "delayed".
const FINAL: DeliveryState[] = ['bounced', 'complained', 'failed']

export function deliveryStateOf(events: readonly Pick<ProgressEvent, 'event'>[]): DeliveryState {
  const seen = new Set(events.map(e => e.event))
  for (const state of FINAL) if (seen.has(state)) return state
  if (seen.has('delivered')) return 'delivered'
  if (seen.has('delayed')) return 'delayed'
  return 'pending'
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const PHASES: RunPhase[] = ['preparing', 'people', 'companies', 'report', 'archive', 'finishing', 'done', 'failed']

// Older runs (before migration 040) and hand-edited rows may hold anything.
export function readStoredProgress(raw: unknown): StoredProgress | null {
  if (!isRecord(raw)) return null
  const base = emptyProgress()
  const planned = isRecord(raw.planned) ? raw.planned : {}
  const single = (v: unknown, fallback: SingleEmailProgress): SingleEmailProgress =>
    isRecord(v)
      ? {
          planned: typeof v.planned === 'boolean' ? v.planned : fallback.planned,
          sent: v.sent === true,
          messageId: typeof v.messageId === 'string' ? v.messageId : null,
        }
      : fallback
  const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0)
  return {
    phase: PHASES.includes(raw.phase as RunPhase) ? (raw.phase as RunPhase) : base.phase,
    planned: { invoice: count(planned.invoice), statement: count(planned.statement), info: count(planned.info) },
    failed: count(raw.failed),
    report: single(raw.report, base.report),
    archive: single(raw.archive, base.archive),
  }
}

export function summariseProgress(
  run: ProgressRun | null,
  deliveries: readonly ProgressDelivery[],
  events: readonly ProgressEvent[],
): ReportProgress {
  const stored = run ? readStoredProgress(run.progress) : null
  const byMessage = new Map<string, ProgressEvent[]>()
  for (const e of events) {
    const list = byMessage.get(e.resend_message_id) ?? []
    list.push(e)
    byMessage.set(e.resend_message_id, list)
  }
  const stateOf = (id: string | null): DeliveryState =>
    id === BLOCKED_MESSAGE_ID ? 'blocked' : id ? deliveryStateOf(byMessage.get(id) ?? []) : 'pending'

  const documents: Record<DocGroup, DocCount> = {
    invoice: { planned: stored?.planned.invoice ?? 0, sent: 0 },
    statement: { planned: stored?.planned.statement ?? 0, sent: 0 },
    info: { planned: stored?.planned.info ?? 0, sent: 0 },
  }
  const delivery: Record<DeliveryState, number> = { pending: 0, delivered: 0, delayed: 0, bounced: 0, complained: 0, failed: 0, blocked: 0 }

  for (const d of deliveries) {
    documents[docGroup(d.kind)].sent++
    if (d.resend_message_id) delivery[stateOf(d.resend_message_id)]++
  }
  // A run from before migration 040 has no plan: what it sent is the plan.
  for (const group of Object.values(documents)) group.planned = Math.max(group.planned, group.sent)

  const single = (p: SingleEmailProgress | undefined, fallbackPlanned: boolean) => {
    const value = p ?? { planned: fallbackPlanned, sent: false, messageId: null }
    const state = stateOf(value.messageId)
    if (value.messageId) delivery[state]++
    return { ...value, delivery: state }
  }
  const report = single(stored?.report, run !== null)
  const archive = single(stored?.archive, false)

  const docsPlanned = documents.invoice.planned + documents.statement.planned + documents.info.planned
  const docsSent = documents.invoice.sent + documents.statement.sent + documents.info.sent

  return {
    status: run ? run.status : 'idle',
    startedAt: run?.started_at ?? null,
    completedAt: run?.completed_at ?? null,
    error: run?.status === 'failed' ? run.last_error : null,
    phase: stored?.phase ?? (run?.status === 'completed' ? 'done' : run?.status === 'failed' ? 'failed' : null),
    documents,
    total: {
      planned: docsPlanned + (report.planned ? 1 : 0) + (archive.planned ? 1 : 0),
      sent: docsSent + (report.sent ? 1 : 0) + (archive.sent ? 1 : 0),
    },
    failed: stored?.failed ?? 0,
    report,
    archive,
    delivery,
  }
}

// 0–100 for the progress bar. Failed documents count as handled.
export function progressPercent(p: ReportProgress): number {
  if (p.status === 'completed') return 100
  if (p.total.planned === 0) return 0
  return Math.min(100, Math.round(((p.total.sent + p.failed) / p.total.planned) * 100))
}
