import { Stepper } from '@kaffeelisten/web'

const noop = () => {}

export function Default() {
  return <Stepper value={1} onChange={noop} />
}

export function Mid() {
  return <Stepper value={3} onChange={noop} />
}

export function Max() {
  return <Stepper value={9} onChange={noop} max={9} />
}
