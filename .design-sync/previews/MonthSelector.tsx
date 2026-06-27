import { MonthSelector } from '@kaffeelisten/web'

const noop = () => {}

export function Default() {
  return (
    <div style={{ padding: 8 }}>
      <MonthSelector value="2026-05" onChange={noop} />
    </div>
  )
}
