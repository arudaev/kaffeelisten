import { AdminButton, AdminIcon } from '@kaffeelisten/web'

const noop = () => {}

export function Primary() {
  return <AdminButton variant="primary" onClick={noop}>Speichern</AdminButton>
}

export function Secondary() {
  return <AdminButton variant="secondary" onClick={noop}>Abbrechen</AdminButton>
}

export function Ghost() {
  return <AdminButton variant="ghost" onClick={noop}>Zurücksetzen</AdminButton>
}

export function Destructive() {
  return (
    <AdminButton variant="destructive" onClick={noop} icon={<AdminIcon name="delete" size={16} />}>
      Löschen
    </AdminButton>
  )
}

export function WithIcon() {
  return (
    <AdminButton variant="primary" onClick={noop} icon={<AdminIcon name="send" size={16} strokeWidth={2} />}>
      Bericht senden
    </AdminButton>
  )
}

export function Small() {
  return <AdminButton variant="secondary" size="sm" onClick={noop} icon={<AdminIcon name="edit" size={14} />}>Bearbeiten</AdminButton>
}
