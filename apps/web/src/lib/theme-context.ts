// Theme context, types, and helpers (kept out of theme.tsx so that file only
// exports the ThemeProvider component — required for React Fast Refresh).

import { createContext, useContext } from 'react'
import type { Palette } from './palettes'

export type ThemeMode = 'light' | 'dark' | 'system'

export const STORAGE_KEY = 'kaffeelisten-theme-mode'

export interface ThemeContextValue {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
  /** Active brand palette (from the global app_theme row). */
  palette: Palette
  /** Apply a palette app-wide immediately (used after saving in Settings). */
  setPalette: (palette: Palette) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

/** Last-known cached global mode (from app_theme.default_mode), or null. */
export function readStoredMode(): ThemeMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return null
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}
