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
  }
  return pending
}

/** Reset the cache. Tests only. */
export function resetAppConfigCache(): void {
  pending = null
}

export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(FALLBACK)
  useEffect(() => {
    let alive = true
    loadAppConfig().then(c => {
      if (alive) setConfig(c)
    })
    return () => {
      alive = false
    }
  }, [])
  return config
}
