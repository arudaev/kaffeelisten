import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { REPORT_MAX_DURATION_MS } from '../api/_lib/report'

// Vercel reads `export const config = { maxDuration }` as a static literal, so the
// report endpoints cannot import the value the PDF budget is computed from. If the
// literal and REPORT_MAX_DURATION_MS drift apart, the run is either killed before
// its PDF deadline or leaves most of its time unused.

const API = join(dirname(fileURLToPath(import.meta.url)), '../api')

function declaredMaxDuration(file: string): number {
  const m = /export const config = \{\s*maxDuration:\s*(\d+)\s*\}/.exec(readFileSync(join(API, file), 'utf8'))
  if (!m) throw new Error(`${file} declares no maxDuration literal`)
  return Number(m[1])
}

describe('report function duration', () => {
  for (const file of ['send-report.ts', 'cron/monthly-report.ts']) {
    it(`${file} matches REPORT_MAX_DURATION_MS`, () => {
      expect(declaredMaxDuration(file) * 1000).toBe(REPORT_MAX_DURATION_MS)
    })
  }
})
