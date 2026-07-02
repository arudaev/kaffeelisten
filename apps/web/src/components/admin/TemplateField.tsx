import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'
import { PLACEHOLDERS, type PlaceholderKey } from '../../lib/reportPlaceholders'

interface TemplateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  /** Placeholder tokens offered as insert-chips for this field. */
  placeholders: PlaceholderKey[]
  /** Render a multi-line textarea instead of a single-line input. */
  multiline?: boolean
  /** Ghost text shown when empty (also drives the example fallback). */
  placeholder?: string
  /** Example text to show when the field is empty — i.e. the built-in default. */
  emptyExample?: string
}

// Matches any known placeholder token, e.g. "{monat}". Built from the shared
// PLACEHOLDERS map so it stays in sync with reportPlaceholders.ts.
const TOKEN_RE = new RegExp(`\\{(${Object.keys(PLACEHOLDERS).join('|')})\\}`, 'gi')

type Part = { t: 'text' | 'tok'; v: string }

function tokenize(str: string): Part[] {
  const parts: Part[] = []
  let last = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(str))) {
    if (m.index > last) parts.push({ t: 'text', v: str.slice(last, m.index) })
    parts.push({ t: 'tok', v: m[0] })
    last = m.index + m[0].length
  }
  if (last < str.length) parts.push({ t: 'text', v: str.slice(last) })
  return parts
}

const keyOf = (token: string) => token.slice(1, -1).toLowerCase() as PlaceholderKey

// Shared text metrics — the mirror and the real input MUST use identical
// typography and padding so the highlighted tokens sit exactly under the
// (transparent) input text.
const TEXT = 'text-[15px] font-medium leading-normal'
const PAD = 'px-[13px] py-[11px]'

/** Non-layout token highlight: box-shadow extends the tint without shifting glyphs. */
const TOKEN_HL =
  'rounded-sm bg-accent-subtle text-accent-hover ' +
  'shadow-[2px_0_0_rgb(var(--accent-subtle)),-2px_0_0_rgb(var(--accent-subtle))]'

/**
 * A labelled subject/intro field that highlights placeholder tokens live
 * *inside* the field (a synced mirror layer renders `{tokens}` as amber chips
 * behind a transparent input), offers pill insert-chips (inserted at the
 * caret), and shows an elevated "Beispiel" card where the tokens are resolved
 * to sample values — so the admin sees exactly what recipients will get.
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
  const mirrorRef = useRef<HTMLDivElement>(null)

  const syncScroll = useCallback(() => {
    const el = ref.current
    const mi = mirrorRef.current
    if (!el || !mi) return
    mi.scrollLeft = el.scrollLeft
    mi.scrollTop = el.scrollTop
  }, [])
  useLayoutEffect(syncScroll, [value, syncScroll])

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

  const parts = tokenize(value)
  const source = value.trim() ? value : emptyExample ?? ''
  const previewParts = tokenize(source)

  const mirrorClass = [
    'pointer-events-none absolute inset-0 overflow-hidden border-0 text-fg',
    TEXT,
    PAD,
    multiline ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
  ].join(' ')

  const inputClass = [
    'relative m-0 block w-full resize-none border-0 bg-transparent font-sans text-transparent caret-accent outline-none',
    TEXT,
    PAD,
  ].join(' ')

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</span>

      <div className="relative rounded-[10px] border-[1.5px] border-border bg-surface-2 transition-all focus-within:border-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/25">
        <div ref={mirrorRef} className={mirrorClass} aria-hidden="true">
          {value === '' && placeholder ? (
            <span className="text-fg-subtle">{placeholder}</span>
          ) : (
            parts.map((p, i) =>
              p.t === 'tok' ? (
                <span key={i} className={TOKEN_HL}>
                  {p.v}
                </span>
              ) : (
                <span key={i}>{p.v}</span>
              ),
            )
          )}
          {'​'}
        </div>
        {multiline ? (
          <textarea
            ref={ref as RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={e => onChange(e.target.value)}
            onScroll={syncScroll}
            rows={2}
            spellCheck={false}
            className={[inputClass, 'min-h-[76px]'].join(' ')}
          />
        ) : (
          <input
            ref={ref as RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            className={inputClass}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs text-fg-subtle">Platzhalter</span>
        {placeholders.map(key => {
          const p = PLACEHOLDERS[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => insert(p.token)}
              title={p.token}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:border-accent hover:bg-accent-subtle hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="text-sm font-bold leading-none text-accent">+</span>
              <span>{p.label}</span>
              <span className="font-mono text-[10.5px] opacity-65">{p.token}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-surface-2 px-3.5 py-[11px]">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">Beispiel</span>
        <span className="text-sm leading-relaxed text-fg">
          {source ? (
            previewParts.map((p, i) =>
              p.t === 'tok' ? (
                <span key={i} className="font-semibold text-accent-hover">
                  {PLACEHOLDERS[keyOf(p.v)].sample}
                </span>
              ) : (
                <span key={i}>{p.v}</span>
              ),
            )
          ) : (
            <span className="italic text-fg-subtle">Noch kein Text</span>
          )}
        </span>
      </div>
    </div>
  )
}
