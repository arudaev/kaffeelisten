// @vitest-environment jsdom
//
// Renders the two components the demo changes. Typecheck and build do not catch
// a broken JSX conditional or a prop that never reaches its control; this does.
// Uses react-dom/client directly, as report-send-dialog.test.tsx does — there is
// no testing-library in this workspace.

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Sidebar renders <Logo>, which reads the active brand palette from the theme
// context. A real ThemeProvider would reach for Supabase, which is not what this
// test is about.
vi.mock('../src/lib/theme-context', () => ({
  useTheme: () => ({
    mode: 'light',
    resolved: 'light',
    setMode: () => {},
    palette: { id: 'bayerwald', name: 'Standard (Amber)', lightAccent: '#D97706', darkAccent: '#F59E0B' },
    setPalette: () => {},
  }),
}))

import PinKeypad from '../src/components/admin/PinKeypad'
import Sidebar from '../src/components/admin/Sidebar'

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

const text = () => container.textContent ?? ''
const buttons = () => Array.from(container.querySelectorAll('button'))

function renderSidebar(demo: boolean) {
  act(() => {
    root.render(
      createElement(MemoryRouter, null,
        createElement(Sidebar, {
          active: 'dashboard',
          onNavigate: () => {},
          onSendReport: () => {},
          onLogout: () => {},
          demo,
          open: false,
          onClose: () => {},
        })),
    )
  })
}

describe('Sidebar', () => {
  it('shows Dokumente and the send button on a campus instance', () => {
    renderSidebar(false)
    expect(text()).toContain('Dokumente')
    expect(text()).toContain('Bericht senden')
  })

  it('hides Dokumente and the send button in the demo', () => {
    renderSidebar(true)
    expect(text()).not.toContain('Dokumente')
    expect(text()).not.toContain('Bericht senden')
  })

  it('still shows everything a prospect explores', () => {
    renderSidebar(true)
    for (const label of ['Übersicht', 'Einträge', 'Unternehmen', 'Mitarbeitende', 'Artikel', 'Einstellungen']) {
      expect(text()).toContain(label)
    }
  })
})

describe('PinKeypad', () => {
  it('shows no credential on a campus instance', () => {
    act(() => root.render(createElement(PinKeypad, { onSubmit: () => {} })))
    expect(text()).not.toContain('Demo')
  })

  it('shows the demo PIN and submits it in one click', () => {
    const onSubmit = vi.fn()
    act(() => root.render(createElement(PinKeypad, { onSubmit, demoPin: '123456' })))
    expect(text()).toContain('123456')

    const open = buttons().find(b => (b.textContent ?? '').includes('Demo'))
    expect(open).toBeTruthy()
    act(() => {
      open!.click()
    })
    expect(onSubmit).toHaveBeenCalledWith('123456')
  })
})

describe('PinKeypad recovery link', () => {
  it('offers "PIN vergessen?" on a campus instance', () => {
    act(() => root.render(createElement(PinKeypad, { onSubmit: () => {}, onForgot: () => {} })))
    expect(text()).toContain('PIN vergessen')
  })

  it('offers no recovery when the page withholds onForgot, as the demo does', () => {
    act(() => root.render(createElement(PinKeypad, { onSubmit: () => {}, demoPin: '123456' })))
    expect(text()).not.toContain('PIN vergessen')
  })

  it('holds the demo panel’s space while the config loads, so nothing jumps', () => {
    act(() => root.render(createElement(PinKeypad, { onSubmit: () => {}, demoPending: true })))
    const spacer = container.querySelector('[aria-hidden="true"]')
    expect(spacer).toBeTruthy()
    expect(spacer!.className).toContain('h-[74px]')
    // The reserved block and the real panel are the same height, so whichever
    // way the config resolves the keypad below does not move.
    const heights = () =>
      Array.from(container.querySelectorAll('div'))
        .map(d => d.className)
        .filter(c => c.includes('h-[74px]'))
    expect(heights()).toHaveLength(1)
    act(() => root.render(createElement(PinKeypad, { onSubmit: () => {}, demoPin: '123456' })))
    expect(heights()).toHaveLength(1)
  })

  it('renders a notice under the dots, which is how the demo answers a lockout', () => {
    act(() => root.render(createElement(PinKeypad, { onSubmit: () => {}, notice: 'Die Demo-PIN steht oben.' })))
    expect(text()).toContain('Die Demo-PIN steht oben.')
  })
})

describe('AdminLogin on the demo', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
    vi.resetModules()
  })

  async function renderLogin(demo: boolean) {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/config')) {
        return { ok: true, json: async () => (demo ? { demo: true, demoPin: '123456' } : { demo: false }) } as Response
      }
      if (url.includes('action=meta')) {
        return { ok: true, json: async () => ({ pin_length: 6 }) } as Response
      }
      // Any verify attempt fails, which is what drives the lockout path.
      return { ok: false, status: 403, json: async () => ({ error: 'Ungültige PIN' }) } as Response
    }) as typeof fetch

    const { resetAppConfigCache, loadAppConfig } = await import('../src/lib/appConfig')
    resetAppConfigCache()
    // main.tsx starts this before React mounts; do the same here.
    await loadAppConfig()
    const { default: AdminLogin } = await import('../src/pages/AdminLogin')
    await act(async () => {
      root.render(createElement(MemoryRouter, null, createElement(AdminLogin)))
    })
  }

  it('shows the PIN on the first rendered frame, not after a delay', async () => {
    await renderLogin(true)
    expect(text()).toContain('123456')
    expect(text()).toContain('Demo')
  })

  it('never offers the e-mail reset, which belongs to a real admin', async () => {
    await renderLogin(true)
    expect(text()).not.toContain('PIN vergessen')
    expect(text()).not.toContain('Admin-E-Mail')
  })

  it('keeps the keypad after repeated wrong entries instead of asking for an e-mail', async () => {
    await renderLogin(true)
    // The "Demo offnen" button calls the page's submit handler straight off, so
    // each click is one real attempt without the keypad's own re-entry guard.
    const open = () => buttons().find(b => (b.textContent ?? '').includes('Demo öffnen'))!
    expect(open()).toBeTruthy()

    // MAX_ATTEMPTS is 5; go past it.
    for (let attempt = 0; attempt < 7; attempt++) {
      await act(async () => { open().click() })
    }

    // The campus instance would be in the e-mail recovery view by now.
    expect(text()).not.toContain('Admin-E-Mail')
    expect(text()).not.toContain('Code senden')
    expect(text()).toContain('Demo-PIN steht oben')
  })

  it('still routes a campus instance into the reset flow after the lockout', async () => {
    await renderLogin(false)
    expect(text()).toContain('PIN vergessen')
  })
})
