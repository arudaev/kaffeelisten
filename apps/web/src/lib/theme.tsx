// App theming: per-device Light/Dark/System mode + a global brand palette.
//
// Mode: persisted per-device in localStorage; the anti-FOUC script in index.html
// sets `data-mode` before paint. If the visitor hasn't chosen a mode, the admin's
// default_mode (from app_theme) applies once loaded.
//
// Palette: fetched from the public app_theme row and applied by overriding the
// --accent CSS variables for the resolved mode. `useTheme` lives in ./theme-context.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { PRESET_PALETTES, findPalette, paletteVars, type Palette } from './palettes'
import {
  ThemeContext,
  STORAGE_KEY,
  readStoredMode,
  systemPrefersDark,
  type ThemeMode,
} from './theme-context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const stored = readStoredMode()
  const hasStoredPref = useRef(stored !== null)
  const [mode, setModeState] = useState<ThemeMode>(stored ?? 'system')
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)
  const [palette, setPaletteState] = useState<Palette>(PRESET_PALETTES[0])

  const resolved: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  // Apply the resolved mode.
  useEffect(() => {
    document.documentElement.dataset.mode = resolved
  }, [resolved])

  // Apply the active palette's accent tokens for the current mode.
  useEffect(() => {
    const vars = paletteVars(palette, resolved)
    const root = document.documentElement
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  }, [palette, resolved])

  // Follow the OS while in System.
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  // Load the global appearance (default mode + brand palette) once.
  useEffect(() => {
    let cancelled = false
    supabase
      .from('app_theme')
      .select('default_mode, active_palette, custom')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return
        setPaletteState(findPalette(data.active_palette, data.custom))
        // Adopt the admin default only when the visitor hasn't set a preference.
        if (!hasStoredPref.current) setModeState(data.default_mode)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    hasStoredPref.current = true
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, palette, setPalette: setPaletteState }}>
      {children}
    </ThemeContext.Provider>
  )
}
