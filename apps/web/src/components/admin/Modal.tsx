import { ReactNode, useEffect, useId } from 'react'
import AdminIcon from './AdminIcon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: ReactNode
  // `lg` for content that needs room, such as a document preview.
  size?: 'md' | 'lg'
}

const widths = { md: 'max-w-[480px]', lg: 'max-w-[760px]' }

export default function Modal({ open, onClose, title, children, actions, size = 'md' }: ModalProps) {
  const titleId = useId()

  // Escape closes, as every dialog is expected to.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={['bg-surface rounded-2xl p-6 w-full shadow-lg max-h-[90vh] flex flex-col', widths[size]].join(' ')}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 id={titleId} className="text-xl font-semibold text-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-fg-muted hover:text-fg p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <AdminIcon name="close" size={20} />
          </button>
        </div>
        <div className="text-sm text-fg-muted leading-relaxed mb-5 overflow-y-auto">{children}</div>
        {actions && (
          <div className="flex flex-wrap justify-end gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
