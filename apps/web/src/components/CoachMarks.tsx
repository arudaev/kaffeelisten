// Hand-drawn hints over the demo: an arrow and a caption pointing at the thing
// a first-time visitor would otherwise have to guess at.
//
// WHY IT LOOKS HAND-DRAWN. A pencil stroke on top of a precise interface reads
// as somebody leaning over and pointing. The same hint drawn in the product's
// own language reads as another control, which is the opposite of helpful. The
// marks are generated from one reference (scripts/art/coach-marks.py).
//
// WHY THE CAPTIONS ARE NOT IN THE IMAGES. They are real text in the DOM, so the
// browser's own translate reaches them, they reflow at small widths and they
// recolour in dark mode. German baked into a PNG does none of that.
//
// WHY IT IS DEMO-ONLY. A campus uses this every day; after the first week an
// arrow over the button is noise. The demo is the one place where every visitor
// is on their first visit.
//
// WHAT KEEPS IT FROM BECOMING CLUTTER, three rules the hard way:
//   * a mark only earns its place if the thing it points at is unguessable —
//     an arrow over the one big button on an otherwise empty screen is ink
//     spent telling somebody what they already knew;
//   * a mark retires the moment the visitor uses the control (`retireHint`),
//     because from then on it is decoration;
//   * the ink arrives a beat after the screen, and faint, so it reads as
//     somebody leaning in rather than as part of the interface.

import { useEffect, useState } from 'react'
import { useLiveHints } from '../lib/coachHints'

export type MarkShape = 'loop' | 'curve' | 'hook' | 'rise' | 'ring'

export interface CoachMark {
  /**
   * Stable id, so the mark can retire once the visitor uses the control it
   * points at (`retireHint`). Without one it shows until the toggle hides it.
   */
  id?: string
  /** Which drawing to use. They are one family; pick by the path that fits. */
  shape: MarkShape
  /** The caption. Plain text so it can be translated and restyled. */
  text: string
  /**
   * Where the mark sits, as CSS inset values. Percentages keep it anchored to
   * the same place in the layout at any width, which an absolute pixel offset
   * would not.
   */
  at: { top?: string; right?: string; bottom?: string; left?: string }
  /** Drawing width. The image keeps its own aspect ratio. */
  width: number
  /** Degrees. The drawings are generated at one angle each and rotated to fit. */
  rotate?: number
  /** Mirror horizontally, so one drawing serves both directions. */
  flip?: boolean
  /** Where the caption sits relative to the drawing. */
  caption?: 'above' | 'below' | 'left' | 'right'
  /** Hide below this viewport width, in px. Small screens have no room. */
  minWidth?: number
}

const HAND_FONT = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&display=swap'

/**
 * Fetch the handwriting face only once a hint is actually on screen.
 *
 * Putting it in index.css would make every campus instance download a font it
 * never renders, for a feature only the demo has.
 */
function useHandFont(active: boolean): void {
  useEffect(() => {
    if (!active || document.querySelector(`link[href="${HAND_FONT}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = HAND_FONT
    document.head.appendChild(link)
  }, [active])
}

const CAPTION_POSITION: Record<NonNullable<CoachMark['caption']>, string> = {
  above: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
  below: 'top-full left-1/2 -translate-x-1/2 mt-1',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

/** How long the page is left to itself before a hint appears, in ms. */
const SETTLE_MS = 800

export default function CoachMarks({ marks }: { marks: CoachMark[] }) {
  const { on, retired } = useLiveHints()
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth))
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Let the screen land before drawing on it. Arriving together with the
  // interface, the ink reads as part of it; arriving a beat later it reads as
  // somebody leaning in — which is the whole idea, and is also what keeps two
  // marks from hitting the eye at the same instant as the content.
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [])

  const visible = on
    ? marks.filter(m => width >= (m.minWidth ?? 640) && !retired(m.id))
    : []
  useHandFont(visible.length > 0)
  if (visible.length === 0) return null

  return (
    // aria-hidden and pointer-events-none together: this is decoration over a
    // working interface. It must never swallow a click meant for the control it
    // is pointing at, and a screen reader already has the control's own label.
    <div
      className={[
        'pointer-events-none fixed inset-0 z-40 overflow-hidden',
        'transition-opacity duration-700 motion-reduce:transition-none',
        settled ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
      aria-hidden="true"
    >
      {visible.map((m, i) => (
        <div key={m.id ?? i} className="absolute" style={m.at}>
          <div className="relative" style={{ width: m.width }}>
            <img
              src={`/assets/coach/${m.shape}.png`}
              alt=""
              // Deliberately faint: a hint competing with the control it points
              // at is worse than no hint. Dark mode needs less again, because
              // inverted white strokes on a dark field read louder than black
              // ink on a light one at the same opacity.
              className="w-full h-auto select-none opacity-[0.55] dark:invert dark:opacity-[0.45]"
              style={{
                transform: `${m.flip ? 'scaleX(-1) ' : ''}rotate(${m.flip ? -(m.rotate ?? 0) : m.rotate ?? 0}deg)`,
              }}
            />
            <span
              className={[
                // The drawing gets quieter; the caption does not. A hint you
                // have to squint at is worse than one you can ignore.
                'absolute whitespace-nowrap text-fg-muted',
                'font-hand text-[18px] leading-tight',
                CAPTION_POSITION[m.caption ?? 'below'],
              ].join(' ')}
            >
              {m.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
