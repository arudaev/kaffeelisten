import { SuccessScreen } from '@kaffeelisten/web'

const noop = () => {}

export function Default() {
  return <SuccessScreen summary="2× Cappuccino für Anna Bauer" onUndo={noop} onReset={noop} />
}
