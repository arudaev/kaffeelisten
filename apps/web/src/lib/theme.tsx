// App theming: per-device Light/Dark/System mode (persisted in localStorage),
// applied by setting `data-mode` on <html>. The anti-FOUC script in index.html
// sets the initial value before React mounts; this provider keeps it in sync.
// `useTheme` and the mode type live in ./theme-context.
//
// A global brand palette (Phase 3) can additionally override the CSS token
// variables at runtime; this provider owns only the light/dark mode.

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  ThemeContext,
  STORAGE_KEY,
  readStoredMode,
  systemPrefersDark,
  type ThemeMode,
} from './theme-context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode)
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)

  const resolved: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    document.documentElement.dataset.mode = resolved
  }, [resolved])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>{children}</ThemeContext.Provider>
  )
}
