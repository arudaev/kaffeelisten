import { EmptyState, AdminButton, AdminIcon } from '@kaffeelisten/web'

const noop = () => {}

export function Default() {
  return (
    <EmptyState
      title="Noch keine Unternehmen."
      body="Sobald du das erste Unternehmen hinzufügst, erscheint es hier."
    />
  )
}

export function WithAction() {
  return (
    <EmptyState
      title="Noch keine Items."
      body="Lege das erste Item an, um loszulegen."
      action={
        <AdminButton variant="primary" onClick={noop} icon={<AdminIcon name="add" size={16} />}>
          Item hinzufügen
        </AdminButton>
      }
    />
  )
}
