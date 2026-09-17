// @vitest-environment jsdom
//
// 2026-09-17: pressing "Senden" with Edge's page translation on blanked the admin
// panel ("NotFoundError: Failed to execute 'removeChild' on 'Node'"). Translators
// replace text nodes with <font> elements; when React later removes one of those
// original text nodes, it is no longer a child of its parent and React crashes.
// These tests translate the dialog the way Chrome/Edge do and walk it through
// every stage.

import { act, createElement, Fragment, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ReportSendView, type ReportSendViewProps, type SendStage } from '../src/components/admin/ReportSendDialog'
import { summariseProgress, type ReportProgress } from '../shared/reportProgress'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

// What Chrome and Edge do to a translated page: every text node becomes <font><font>…</font></font>.
function translatePage(el: Node) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const texts: Text[] = []
  while (walker.nextNode()) {
    const t = walker.currentNode as Text
    if (t.data.trim()) texts.push(t)
  }
  for (const t of texts) {
    const outer = document.createElement('font')
    const inner = document.createElement('font')
    inner.textContent = `[EN] ${t.data}`
    outer.appendChild(inner)
    t.parentNode!.replaceChild(outer, t)
  }
}

function render(node: ReactNode) {
  act(() => root.render(node))
}

const progress = (phase: string, status: 'running' | 'completed', sent: number): ReportProgress =>
  summariseProgress(
    {
      status,
      started_at: '2026-09-17T08:14:00Z',
      completed_at: status === 'completed' ? '2026-09-17T08:14:14Z' : null,
      last_error: null,
      progress: {
        phase,
        planned: { invoice: 2, statement: 0, info: 11 },
        failed: 0,
        report: { planned: true, sent: status === 'completed', messageId: status === 'completed' ? 'r' : null },
        archive: { planned: true, sent: status === 'completed', messageId: null },
      },
    },
    Array.from({ length: sent }, (_, i) => ({ kind: i < 2 ? 'member_invoice' : 'member_info', resend_message_id: `m${i}` })),
    [{ resend_message_id: 'm0', event: 'delivered', occurred_at: '2026-09-17T08:14:20Z' }],
  )

const noop = () => {}
const view = (stage: SendStage, extra: Partial<ReportSendViewProps> = {}) =>
  createElement(ReportSendView, {
    open: true,
    stage,
    month: '2026-09',
    entryCount: 312,
    totalCents: 41040,
    progress: null,
    result: null,
    error: null,
    onSend: noop,
    onClose: noop,
    onOpenDocuments: noop,
    ...extra,
  })

describe('send dialog under browser translation', () => {
  it('the simulation reproduces the crash on the old markup (a fragment of bare text)', () => {
    const Old = ({ done }: { done: boolean }) =>
      createElement('div', null, done
        ? createElement('p', null, 'Fertig')
        : createElement(Fragment, null, 'Der Versand für ', createElement('strong', null, 'September 2026'), ' geht an alle.'))
    render(createElement(Old, { done: false }))
    translatePage(container)
    // React 18 reports the commit error and unmounts; either way the panel is gone.
    let crashed = false
    try {
      render(createElement(Old, { done: true }))
    } catch {
      crashed = true
    }
    crashed ||= !container.textContent?.includes('Fertig')
    expect(crashed).toBe(true)
  })

  it('survives confirm → running → done → closed while translated', () => {
    render(view('confirm'))
    translatePage(container)

    render(view('running', { progress: null }))
    translatePage(container)
    render(view('running', { progress: progress('people', 'running', 3) }))
    translatePage(container)
    render(view('running', { progress: progress('companies', 'running', 13) }))
    translatePage(container)
    render(view('done', {
      progress: progress('done', 'completed', 13),
      result: { sent: 13, failed: 0, skipped: [{ recipient: 'company', name: 'Gramm', reason: 'no_billing_contact' }], missingFiles: { pdf: 1, xlsx: 0 } },
    }))
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
    expect(container.textContent).toContain('Monatsversand abgeschlossen')

    translatePage(container)
    render(view('failed', { error: 'Fehler beim Senden: Resend down' }))
    render(view('confirm', { open: false }))
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})

describe('send dialog progress', () => {
  it('shows invoices with attachments, email-only documents, the report and delivery', () => {
    render(view('running', { progress: progress('companies', 'running', 5) }))
    const text = container.textContent ?? ''
    expect(text).toContain('E-Mails an die Unternehmen werden versendet')
    expect(text).toContain('5 von 15')
    expect(text).toMatch(/Rechnungen\s*mit PDF und Excel2 \/ 2/)
    expect(text).toMatch(/Informationen\s*nur E-Mail3 \/ 11/)
    expect(text).toContain('Bericht an die Verwaltung')
    expect(text).toContain('Zugestellt1 von 5')
    const bar = container.querySelector('progress')!
    expect(Number(bar.getAttribute('value'))).toBe(33)
  })
})
