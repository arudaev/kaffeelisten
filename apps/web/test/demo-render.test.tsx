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
