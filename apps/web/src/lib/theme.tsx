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

// Generate an accent-coloured SVG favicon (the logo mark) as a data URI and set
// it as the tab icon + the browser theme-colour, so the favicon tracks the
// active brand palette. The installed PWA PNG icons stay static (OS-cached).
function applyBrandFavicon(accent: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
    `<rect width="200" height="200" rx="40" fill="${accent}"/>` +
    `<g fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,20)">` +
    `<path d="M40 60c0-3 3-6 8-6h70c5 0 8 3 8 6"/><ellipse cx="83" cy="60" rx="43" ry="6"/>` +
    `<path d="M40 60v40c0 14 12 26 26 26h34c14 0 26-12 26-26V60"/>` +
    `<path d="M126 70h12c10 0 18 8 18 18v0c0 10-8 18-18 18h-12"/>` +
    `<path d="M70 28c-3 6 3 12 0 18"/><path d="M83 22c-3 6 3 12 0 18"/><path d="M96 28c-3 6 3 12 0 18"/></g></svg>`
  const href = 'data:image/svg+xml,' + encodeURIComponent(svg)
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/svg+xml'
  link.href = href
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', accent)
}

const PALETTE_CACHE_KEY = 'kaffeelisten-theme-palette'

function readCachedPalette(): Palette | null {
  try {
    const raw = localStorage.getItem(PALETTE_CACHE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Palette
      if (p && p.lightAccent && p.darkAccent) return p
    }
  } catch {
    /* ignore */
  }
  return null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const stored = readStoredMode()
  const hasStoredPref = useRef(stored !== null)
  const [mode, setModeState] = useState<ThemeMode>(stored ?? 'system')
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)
  // Start from the cached palette so we never flash the default before the
  // app_theme fetch resolves.
  const [palette, setPaletteState] = useState<Palette>(() => readCachedPalette() ?? PRESET_PALETTES[0])

  const resolved: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  // Apply the resolved mode.
  useEffect(() => {
    document.documentElement.dataset.mode = resolved
  }, [resolved])

  // Apply the active palette's accent tokens for the current mode, and cache both
  // modes so the anti-FOUC script in index.html can paint the right accent on the
  // next load without a flash of the default palette.
  useEffect(() => {
    const root = document.documentElement
    for (const [k, v] of Object.entries(paletteVars(palette, resolved))) root.style.setProperty(k, v)
    applyBrandFavicon(resolved === 'dark' ? palette.darkAccent : palette.lightAccent)
    try {
      localStorage.setItem(
        'kaffeelisten-theme-vars',
        JSON.stringify({ light: paletteVars(palette, 'light'), dark: paletteVars(palette, 'dark') }),
      )
      localStorage.setItem(PALETTE_CACHE_KEY, JSON.stringify(palette))
    } catch {
      /* ignore */
    }
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
