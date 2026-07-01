import { ReactNode } from 'react'
import AdminIcon from './AdminIcon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: ReactNode
}

export default function Modal({ open, onClose, title, children, actions }: ModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl p-6 w-full max-w-[480px] shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-xl font-semibold text-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <AdminIcon name="close" size={20} />
          </button>
        </div>
        <div className="text-sm text-fg-muted leading-relaxed mb-5">{children}</div>
        {actions && (
          <div className="flex justify-end gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
