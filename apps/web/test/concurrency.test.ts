import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from '../api/_lib/concurrency'

const tick = () => new Promise(r => setImmediate(r))

describe('mapWithConcurrency', () => {
  it('never runs more than the limit at once', async () => {
    let inFlight = 0
    let peak = 0
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await tick()
      await tick()
      inFlight--
    })
    expect(peak).toBe(4)
  })

  it('returns results in input order even when later items finish first', async () => {
    const out = await mapWithConcurrency([30, 10, 20, 0], 4, async ms => {
      await new Promise(r => setTimeout(r, ms))
      return ms
    })
    expect(out).toEqual([30, 10, 20, 0])
  })

  it('handles an empty list and a limit larger than the list', async () => {
    expect(await mapWithConcurrency([], 4, async x => x)).toEqual([])
    expect(await mapWithConcurrency([1, 2], 10, async x => x * 2)).toEqual([2, 4])
  })

  it('rejects an invalid limit rather than hanging', async () => {
    await expect(mapWithConcurrency([1], 0, async x => x)).rejects.toThrow()
  })
})
