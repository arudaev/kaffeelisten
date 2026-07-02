import { PinInput } from '@kaffeelisten/web'

const noop = () => {}

export function Empty() {
  return (
    <div style={{ width: 300 }}>
      <PinInput value="" onChange={noop} ariaLabel="PIN" />
    </div>
  )
}

export function PartiallyFilled() {
  return (
    <div style={{ width: 300 }}>
      <PinInput value="123" onChange={noop} ariaLabel="PIN" />
    </div>
  )
}

export function Invalid() {
  return (
    <div style={{ width: 300 }}>
      <PinInput value="000000" onChange={noop} invalid ariaLabel="PIN" />
    </div>
  )
}

export function ResetCodeRevealed() {
  return (
    <div style={{ width: 300 }}>
      <PinInput value="4827" onChange={noop} length={4} reveal ariaLabel="Reset-Code" />
    </div>
  )
}
