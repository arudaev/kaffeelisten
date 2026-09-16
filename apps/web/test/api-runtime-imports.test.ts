import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Vercel runs api/ as CommonJS but src/ is an ES module package. A runtime
// (non-type) import from api/ into src/ crashes every function at startup with
// ERR_REQUIRE_ESM, which unit tests and typecheck do not catch. Happened on
// 2026-09-16; shared code lives in api/_lib and src/ re-exports it.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []
  })
}

describe('api runtime imports', () => {
  const root = join(__dirname, '..')
  it('never imports runtime values from src/', () => {
    const offenders = files(join(root, 'api')).flatMap(f => {
      const src = readFileSync(f, 'utf8')
      return [...src.matchAll(/^import\s+(?!type\b)[^;]*?from\s+'([^']+)'/gms)]
        .filter(m => m[1].includes('/src/'))
        .map(m => `${relative(root, f)} → ${m[1]}`)
    })
    expect(offenders).toEqual([])
  })
})
