// What a month cell in the Bezahlt column shows.
//   'paid'  — ticked
//   'open'  — something was consumed and it is not ticked yet
//   'none'  — nothing consumed and nothing ticked: no checkbox, just a dash.
// A zero month used to render a faint clickable box for every person, which made
// people who never drink coffee look like open payments.
export type TickState = 'paid' | 'open' | 'none'

export function tickState(cell: { paid?: boolean; amount_cents?: number } | undefined): TickState {
  if (cell?.paid) return 'paid'
  return (cell?.amount_cents ?? 0) > 0 ? 'open' : 'none'
}
