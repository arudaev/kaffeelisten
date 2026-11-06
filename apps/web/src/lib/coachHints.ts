// Whether the demo's hand-drawn hints are showing, and how to flip it.
//
// Separate from CoachMarks.tsx because a component file that also exports
// helpers breaks react-refresh/only-export-components — the same split as
// adminNav.ts beside Sidebar.tsx and theme-context.ts beside theme.tsx.
//
// The toggle (the start screen's footer) and the overlay are in different parts
// of the tree and neither owns the other, so they meet at a window event rather
// than at a context that would exist only for this.

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'kaffeelisten.demo.hints'
const DONE_KEY = 'kaffeelisten.demo.hints.done'
const EVENT = 'kaffeelisten:hints'

/** Are the hints on? Default on: on the demo every visit is a first visit. */
export function hintsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    // Blocked site data. Showing them is the safer default — the visitor can
    // still turn them off for this page view.
    return true
  }
}

export function setHintsEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
    // Switching them back on means "show me those again". Keeping the retired
    // set would switch them on to nothing, which reads as a broken toggle.
    if (on) localStorage.removeItem(DONE_KEY)
  } catch {
    // Nothing to persist to; the listeners below still flip for this view.
  }
  window.dispatchEvent(new CustomEvent(EVENT))
}

/**
 * A hint retires the moment the visitor does the thing it points at.
 *
 * This is what keeps the overlay from becoming wallpaper. An arrow over a
 * control you have already used is pure noise: it taught its one thing and now
 * it is only ink on the interface. Per browser, like the toggle, because the
 * demo has no accounts to hang it on.
 */
export function hintRetired(id: string | undefined): boolean {
  if (!id) return false
  try {
    const raw = localStorage.getItem(DONE_KEY)
    return raw ? raw.split(',').includes(id) : false
  } catch {
    return false
  }
}

export function retireHint(id: string): void {
  try {
    const raw = localStorage.getItem(DONE_KEY)
    const done = raw ? raw.split(',').filter(Boolean) : []
    if (!done.includes(id)) localStorage.setItem(DONE_KEY, [...done, id].join(','))
  } catch {
    // Can't remember it; the hint simply stays. Harmless.
  }
  window.dispatchEvent(new CustomEvent(EVENT))
}

/**
 * Subscribe to the toggle and to retirement, including from another tab.
 *
 * One hook for both because `hintRetired` is read during render and a retire
 * leaves `hintsEnabled` unchanged — a hook that only tracked the boolean would
 * not re-render, and the hint the visitor just used would sit there until the
 * next navigation.
 */
function useHintSubscription(): number {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const sync = () => setRevision(r => r + 1)
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return revision
}

/** Subscribe to the toggle, including from another tab (`storage`). */
export function useHintsEnabled(): boolean {
  useHintSubscription()
  return hintsEnabled()
}

/** Subscribe to the toggle and tell retired hints from live ones. */
export function useLiveHints(): { on: boolean; retired: (id: string | undefined) => boolean } {
  useHintSubscription()
  return { on: hintsEnabled(), retired: hintRetired }
}
