import { DayGridPicker } from '@kaffeelisten/web'

const noop = () => {}

export function DaySelected() {
  return (
    <div style={{ width: 340 }}>
      <DayGridPicker value={1} onChange={noop} />
    </div>
  )
}

export function LastDayOfMonth() {
  return (
    <div style={{ width: 340 }}>
      <DayGridPicker value={null} onChange={noop} />
    </div>
  )
}

export function Disabled() {
  return (
    <div style={{ width: 340 }}>
      <DayGridPicker value={15} onChange={noop} disabled />
    </div>
  )
}
