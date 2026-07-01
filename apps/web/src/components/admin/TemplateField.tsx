import { useRef, type RefObject } from 'react'
import {
  PLACEHOLDERS,
  renderExample,
  type PlaceholderKey,
} from '../../lib/reportPlaceholders'

interface TemplateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  /** Placeholder tokens offered as insert-chips for this field. */
  placeholders: PlaceholderKey[]
  /** Render a multi-line textarea instead of a single-line input. */
  multiline?: boolean
  /** Native placeholder shown when empty (also drives the example fallback). */
  placeholder?: string
  /** Example text to show when the field is empty — i.e. the built-in default. */
  emptyExample?: string
}

const fieldBase =
  'w-full px-3 border border-border rounded bg-surface-2 text-base text-fg ' +
  'placeholder:text-fg-subtle outline-none transition-colors ' +
  'focus:bg-surface focus:border-accent focus:ring-1 focus:ring-accent'

/**
 * A labelled subject/intro field with clickable placeholder chips (inserted at
 * the caret) and a live "Beispiel:" line that resolves the tokens to sample
 * values — so the admin sees exactly what the finished text looks like.
 */
export default function TemplateField({
  label,
  value,
  onChange,
  placeholders,
  multiline = false,
  placeholder,
  emptyExample,
}: TemplateFieldProps) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const insert = (token: string) => {
    const el = ref.current
    if (!el) {
      onChange(value + token)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = value.slice(0, start) + token + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  const source = value.trim() ? value : emptyExample ?? ''
  const example = renderExample(source)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">{label}</span>

      {multiline ? (
        <textarea
          ref={ref as RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className={[fieldBase, 'py-2.5 min-h-[76px] resize-y'].join(' ')}
        />
      ) : (
        <input
          ref={ref as RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={[fieldBase, 'h-11'].join(' ')}
        />
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-fg-subtle mr-0.5">Einfügen:</span>
        {placeholders.map(key => {
          const p = PLACEHOLDERS[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => insert(p.token)}
              title={p.token}
              className="inline-flex items-center gap-1 rounded bg-surface-2 hover:bg-border text-fg-muted text-xs font-medium px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="text-accent">+</span>
              {p.label}
            </button>
          )
        })}
      </div>

      {example && (
        <p className="text-[13px] text-fg-muted leading-relaxed">
          Beispiel: <span className="text-fg">{example}</span>
        </p>
      )}
    </div>
  )
}
