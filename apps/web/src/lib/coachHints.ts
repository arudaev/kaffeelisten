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
  } catch {
    // Nothing to persist to; the listeners below still flip for this view.
  }
  window.dispatchEvent(new CustomEvent(EVENT))
}

/** Subscribe to the toggle, including from another tab (`storage`). */
export function useHintsEnabled(): boolean {
  const [on, setOn] = useState(hintsEnabled)
  useEffect(() => {
    const sync = () => setOn(hintsEnabled())
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return on
}
