// Runtime configuration from /api/config, fetched once per page load.
//
// The member flow already needed the per-order cap; the admin area now also
// needs to know whether this deployment is the public demo, so that it can hide
// what the demo switches off instead of rendering controls whose endpoints
// answer 410. The interface is a convenience — the server is the control.

import { useEffect, useState } from 'react'

export interface AppConfig {
  maxItemsPerOrder: number | null
  /** True only on the public demo deployment (DEMO_MODE). */
  demo: boolean
  /**
   * The demo's admin PIN, shown on the login screen so a visitor can get in.
   * Present only when `demo` is true: the server omits it everywhere else, and
   * a campus instance's PIN never leaves the server.
   */
  demoPin: string | null
}

const FALLBACK: AppConfig = { maxItemsPerOrder: null, demo: false, demoPin: null }

let pending: Promise<AppConfig> | null = null

/**
 * The resolved config, kept so a component mounting after the fetch has landed
 * renders the real values on its FIRST frame.
 *
 * Without this the demo's login screen painted the plain keypad and only then
 * dropped in the "Demo — PIN …" panel, which read as a glitch on the one screen
 * every visitor sees first. main.tsx starts the fetch before React mounts, so by
 * the time /admin renders this is usually already filled in.
 */
let resolved: AppConfig | null = null

/** Fetch once and share the result; /api/config is immutable for a page load. */
export function loadAppConfig(): Promise<AppConfig> {
  if (!pending) {
    pending = fetch('/api/config')
      .then(r => (r.ok ? r.json() : FALLBACK))
      .then((d: Partial<AppConfig>) => ({
        maxItemsPerOrder: d.maxItemsPerOrder ?? null,
        // Never infer the demo from a missing field: an unreachable config must
        // not turn a campus instance into a demo.
        demo: d.demo === true,
        demoPin: typeof d.demoPin === 'string' && d.demoPin ? d.demoPin : null,
      }))
      .catch(() => FALLBACK)
      .then(c => {
        resolved = c
        return c
      })
  }
  return pending
}

/**
 * Is this the demo, right now, without awaiting?
 *
 * For call sites that cannot be async — the admin API client decides whether a
 * write goes to the server or to the visitor's own browser before it has a
 * promise to await. main.tsx starts the fetch before React mounts and the admin
 * area is only reachable after a login round-trip, so this is resolved by then.
 * Unresolved reads as "not a demo", which is the safe way round: a campus
 * instance must never be mistaken for one.
 */
export function isDemoNow(): boolean {
  return resolved?.demo === true
}

/** Reset the cache. Tests only. */
export function resetAppConfigCache(): void {
  pending = null
  resolved = null
}

/**
 * The runtime config, plus whether it is still being fetched.
 *
 * `loading` exists so a screen whose layout depends on the config can hold the
 * space instead of letting content appear late — see AdminLogin/PinKeypad.
 */
export function useAppConfig(): AppConfig & { loading: boolean } {
  const [config, setConfig] = useState<AppConfig | null>(resolved)
  useEffect(() => {
    if (config) return
    let alive = true
    loadAppConfig().then(c => {
      if (alive) setConfig(c)
    })
    return () => {
      alive = false
    }
  }, [config])
  return { ...(config ?? FALLBACK), loading: config === null }
}
