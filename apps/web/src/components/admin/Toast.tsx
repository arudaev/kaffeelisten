import AdminIcon from './AdminIcon'

type ToastKind = 'success' | 'error'

interface ToastProps {
  /** Message to show. When null/empty the toast renders nothing. */
  message: string | null
  kind?: ToastKind
}

const kindClasses: Record<ToastKind, string> = {
  success: 'bg-stone-900 text-white',
  error: 'bg-red-600 text-white',
}

export default function Toast({ message, kind = 'success' }: ToastProps) {
  if (!message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium shadow-lg',
        kindClasses[kind],
      ].join(' ')}
    >
      <AdminIcon name={kind === 'error' ? 'close' : 'check'} size={18} strokeWidth={2.5} />
      {message}
    </div>
  )
}
