import { InputHTMLAttributes, ReactNode, useId } from 'react'

type Variant = 'form' | 'filter'

interface AdminFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Field label rendered above the input (form variant) or as the accessible name (filter variant). */
  label?: string
  /** Helper text shown below the input. */
  hint?: string
  /** Error message shown below the input; also switches the border to the error colour. */
  error?: string
  /** Leading adornment, e.g. a search icon (mainly for the filter variant). */
  leading?: ReactNode
  /** `form` = tall field for modals/forms; `filter` = compact field for toolbars. */
  variant?: Variant
}

const inputBase =
  'w-full border outline-none transition-colors text-fg placeholder:text-fg-subtle ' +
  'focus:border-accent focus:ring-1 focus:ring-accent'

const variantClasses: Record<Variant, string> = {
  form: 'h-11 px-3 bg-surface-2 rounded text-base focus:bg-surface',
  filter: 'h-9 px-3 bg-surface rounded-md text-sm',
}

export default function AdminField({
  label,
  hint,
  error,
  leading,
  variant = 'form',
  className,
  id,
  ...rest
}: AdminFieldProps) {
  const reactId = useId()
  const inputId = id ?? reactId
  const border = error ? 'border-error' : 'border-border'

  const input = (
    <div className={leading ? 'relative' : undefined}>
      {leading && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none">
          {leading}
        </span>
      )}
      <input
        id={inputId}
        aria-label={!label && typeof rest.placeholder === 'string' ? rest.placeholder : undefined}
        className={[
          inputBase,
          variantClasses[variant],
          border,
          leading ? 'pl-8' : '',
          className ?? '',
        ].join(' ')}
        {...rest}
      />
    </div>
  )

  if (variant === 'filter' && !label) return input

  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">
          {label}{rest.required && <span className="text-error"> *</span>}
        </span>
      )}
      {input}
      {error ? (
        <span className="text-xs text-error">{error}</span>
      ) : hint ? (
        <span className="text-xs text-fg-muted">{hint}</span>
      ) : null}
    </label>
  )
}
