import { Badge } from '@kaffeelisten/web'

export function Active() {
  return <Badge kind="active">Aktiv</Badge>
}

export function Inactive() {
  return <Badge kind="inactive">Inaktiv</Badge>
}

export function Warn() {
  return <Badge kind="warn">Ausstehend</Badge>
}

export function Error() {
  return <Badge kind="error">Fehler</Badge>
}
