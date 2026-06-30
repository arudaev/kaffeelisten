import { Toggle } from '@kaffeelisten/web'

const noop = () => {}

export function On() {
  return <Toggle checked onChange={noop} />
}

export function Off() {
  return <Toggle checked={false} onChange={noop} />
}

export function WithLabel() {
  return <Toggle checked label="Aktiv" onChange={noop} />
}
