import { describe, expect, it } from 'vitest'
import {
  deliveryStateOf,
  progressPercent,
  readStoredProgress,
  summariseProgress,
  type ProgressRun,
} from '../shared/reportProgress'

const run = (progress: unknown, status: ProgressRun['status'] = 'running'): ProgressRun => ({
  status,
  started_at: '2026-09-17T08:14:00Z',
  completed_at: status === 'completed' ? '2026-09-17T08:14:14Z' : null,
  last_error: status === 'failed' ? 'Resend down' : null,
  progress,
})

const planned = {
  phase: 'companies',
  planned: { invoice: 8, statement: 2, info: 11 },
  failed: 1,
  report: { planned: true, sent: false, messageId: null },
  archive: { planned: true, sent: false, messageId: null },
}

describe('summariseProgress', () => {
  it('counts sent documents per kind against the plan, including the report and archive', () => {
    const p = summariseProgress(
      run(planned),
      [
        { kind: 'member_invoice', resend_message_id: 'a' },
        { kind: 'company_invoice', resend_message_id: 'b' },
        { kind: 'member_info', resend_message_id: 'c' },
        { kind: 'member_statement', resend_message_id: 'd' },
      ],
      [],
    )
    expect(p.phase).toBe('companies')
    expect(p.documents).toEqual({
      invoice: { planned: 8, sent: 2 },
      statement: { planned: 2, sent: 1 },
      info: { planned: 11, sent: 1 },
    })
    expect(p.total).toEqual({ planned: 23, sent: 4 })
    expect(p.failed).toBe(1)
    expect(progressPercent(p)).toBe(Math.round((5 / 23) * 100))
  })

  it('reports delivery status from webhook events, a bounce outranking a delay', () => {
    const p = summariseProgress(
      run({ ...planned, report: { planned: true, sent: true, messageId: 'r' } }, 'completed'),
      [
        { kind: 'member_invoice', resend_message_id: 'a' },
        { kind: 'member_info', resend_message_id: 'b' },
        { kind: 'member_info', resend_message_id: 'c' },
      ],
      [
        { resend_message_id: 'a', event: 'delivered', occurred_at: '2026-09-17T08:15:00Z' },
        { resend_message_id: 'b', event: 'delayed', occurred_at: '2026-09-17T08:15:00Z' },
        { resend_message_id: 'b', event: 'bounced', occurred_at: '2026-09-17T08:16:00Z' },
        { resend_message_id: 'r', event: 'delivered', occurred_at: '2026-09-17T08:15:00Z' },
      ],
    )
    expect(p.delivery).toEqual({ pending: 1, delivered: 2, delayed: 0, bounced: 1, complained: 0, failed: 0, blocked: 0 })
    expect(p.report.delivery).toBe('delivered')
    expect(progressPercent(p)).toBe(100)
  })

  it('counts emails the staging mail guard held back as blocked, not as waiting for delivery', () => {
    const p = summariseProgress(
      run({ ...planned, report: { planned: true, sent: true, messageId: 'blocked-by-mail-guard' } }, 'completed'),
      [{ kind: 'member_info', resend_message_id: 'blocked-by-mail-guard' }, { kind: 'member_info', resend_message_id: 'x' }],
      [],
    )
    expect(p.delivery.blocked).toBe(2)
    expect(p.delivery.pending).toBe(1)
    expect(p.report.delivery).toBe('blocked')
  })

  it('treats a run from before migration 040 (no stored plan) as planned = sent', () => {
    const p = summariseProgress(run(null, 'completed'), [{ kind: 'company_statement', resend_message_id: null }], [])
    expect(p.documents.statement).toEqual({ planned: 1, sent: 1 })
    expect(p.phase).toBe('done')
  })

  it('is idle when the month has never been sent', () => {
    const p = summariseProgress(null, [], [])
    expect(p.status).toBe('idle')
    expect(p.total).toEqual({ planned: 0, sent: 0 })
    expect(progressPercent(p)).toBe(0)
  })

  it('passes the error of a failed run', () => {
    expect(summariseProgress(run(planned, 'failed'), [], []).error).toBe('Resend down')
  })
})

describe('readStoredProgress', () => {
  it('ignores malformed values instead of trusting them', () => {
    const p = readStoredProgress({ phase: 'launching', planned: { invoice: -3, info: 'x' }, failed: 2.7 })
    expect(p?.phase).toBe('preparing')
    expect(p?.planned).toEqual({ invoice: 0, statement: 0, info: 0 })
    expect(p?.failed).toBe(2)
    expect(readStoredProgress('nope')).toBeNull()
  })

  it('delivery state is pending without events', () => {
    expect(deliveryStateOf([])).toBe('pending')
  })
})
