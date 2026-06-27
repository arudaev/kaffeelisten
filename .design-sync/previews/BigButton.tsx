import { BigButton, Icon } from '@kaffeelisten/web'

const noop = () => {}

export function Primary() {
  return <BigButton variant="primary" onClick={noop}>Eintragen</BigButton>
}

export function Secondary() {
  return <BigButton variant="secondary" onClick={noop}>Abbrechen</BigButton>
}

export function Ghost() {
  return (
    <BigButton variant="ghost" onClick={noop} icon={<Icon name="undo" size={20} strokeWidth={2} />}>
      Rückgängig
    </BigButton>
  )
}

export function WithIcon() {
  return (
    <BigButton variant="primary" onClick={noop} icon={<Icon name="check" size={20} strokeWidth={2} />}>
      Bestätigen
    </BigButton>
  )
}

export function Disabled() {
  return <BigButton variant="primary" disabled onClick={noop}>Eintragen</BigButton>
}
