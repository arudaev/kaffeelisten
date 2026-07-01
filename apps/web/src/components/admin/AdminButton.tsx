import { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'md' | 'sm'

interface AdminButtonProps {
  variant?: Variant
  size?: Size
  children?: ReactNode
  onClick?: () => void
  icon?: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
}

const sizeClasses: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-[13px]',
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white border-transparent font-semibold hover:bg-accent-hover',
  secondary: 'bg-surface text-fg border-border font-medium hover:bg-surface-2',
  ghost: 'bg-transparent text-fg border-transparent font-medium hover:bg-surface-2',
  destructive: 'bg-surface text-error border-error font-medium hover:bg-error-subtle',
}

export default function AdminButton({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  icon,
  disabled = false,
  type = 'button',
}: AdminButtonProps) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2',
        'rounded-md border transition-colors duration-[120ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        sizeClasses[size],
        variantClasses[variant],
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {icon}
      {children}
    </button>
  )
}
