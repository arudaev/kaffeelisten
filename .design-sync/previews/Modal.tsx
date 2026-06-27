import { Modal, AdminButton } from '@kaffeelisten/web'

const noop = () => {}

export function Confirm() {
  return (
    <Modal
      open
      onClose={noop}
      title="Bericht senden?"
      actions={
        <>
          <AdminButton variant="secondary" onClick={noop}>Abbrechen</AdminButton>
          <AdminButton variant="primary" onClick={noop}>Jetzt senden</AdminButton>
        </>
      }
    >
      Der Monatsbericht für Mai 2026 wird an die Admin-Adresse gesendet.
    </Modal>
  )
}
