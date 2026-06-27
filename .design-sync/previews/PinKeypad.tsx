import { PinKeypad } from '@kaffeelisten/web'

const noop = () => {}

export function Default() {
  return <PinKeypad onSubmit={noop} />
}
