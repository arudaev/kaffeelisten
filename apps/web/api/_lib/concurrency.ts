// Bounded-concurrency map. Used to render per-recipient PDFs a few at a time on
// one shared Chromium: serial rendering took ~1s per document, which alone
// exceeded the function time limit at ITC1's volume (~90 documents a month).

/**
 * Apply `fn` to every item with at most `limit` calls in flight, returning the
 * results in input order. A rejection rejects the whole map, like Promise.all —
 * callers that must not fail per item should catch inside `fn`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new Error(`concurrency limit must be a positive integer, got ${limit}`)
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
