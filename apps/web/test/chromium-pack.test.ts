import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CHROMIUM_VERSION, chromiumPackUrl } from '../api/_lib/pdf'

describe('chromium pack url', () => {
  it('uses the per-architecture asset name that the release actually publishes', () => {
    expect(chromiumPackUrl('x64')).toMatch(/\/chromium-v[\d.]+-pack\.x64\.tar$/)
    expect(chromiumPackUrl('arm64')).toMatch(/\/chromium-v[\d.]+-pack\.arm64\.tar$/)
    expect(chromiumPackUrl('x64')).not.toMatch(/-pack\.tar$/)
  })

  it('matches the installed @sparticuz/chromium-min version', () => {
    const lock = JSON.parse(readFileSync(new URL('../../../package-lock.json', import.meta.url), 'utf-8')) as {
      packages: Record<string, { version?: string }>
    }
    expect(lock.packages['node_modules/@sparticuz/chromium-min']?.version).toBe(CHROMIUM_VERSION)
    expect(chromiumPackUrl('x64')).toContain(`/download/v${CHROMIUM_VERSION}/`)
  })
})
