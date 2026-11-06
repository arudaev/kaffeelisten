// @vitest-environment jsdom
//
// The demo's hints, and the rules that keep them from becoming wallpaper: a
// mark disappears once the visitor has used the control it points at, a mark
// can wait its turn behind another, and turning the hints back on really does
// bring them back rather than switching them on to nothing.
//
// Worth a test because every one of these is invisible when it breaks: a hint
// that fails to retire looks exactly like a hint, and the bug is only that the
// demo slowly fills up with ink nobody needs any more.

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import CoachMarks, { type CoachMark } from '../src/components/CoachMarks'
import { hintRetired, hintsEnabled, retireHint, setHintsEnabled } from '../src/lib/coachHints'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

function render(marks: CoachMark[]) {
  act(() => {
    root.render(createElement(CoachMarks, { marks }))
  })
}

/** The captions on screen, which is what a visitor actually experiences. */
function captions(): string[] {
  return [...host.querySelectorAll('span')].map(s => s.textContent ?? '')
}

const PIN: CoachMark = { id: 'login-pin', shape: 'curve', text: 'PIN steht hier', at: {}, width: 100, minWidth: 0 }
const BACK: CoachMark = { id: 'login-back', shape: 'hook', text: 'Zurück zur App', at: {}, width: 60, minWidth: 0 }

beforeEach(() => {
  localStorage.clear()
  // The overlay reads window.innerWidth to drop marks on narrow screens.
  Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
  host = document.createElement('div')
  document.body.appendChild(host)
  act(() => {
    root = createRoot(host)
  })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  localStorage.clear()
})

describe('remembering which hints are done', () => {
  it('starts with none retired, because every visit is a first visit', () => {
    expect(hintRetired('login-pin')).toBe(false)
    expect(hintsEnabled()).toBe(true)
  })

  it('retires one hint without touching the others', () => {
    retireHint('login-pin')
    expect(hintRetired('login-pin')).toBe(true)
    expect(hintRetired('login-back')).toBe(false)
  })

  it('retires the same hint twice without growing the record', () => {
    retireHint('login-pin')
    retireHint('login-pin')
    expect(localStorage.getItem('kaffeelisten.demo.hints.done.v2')).toBe('login-pin')
  })

  it('treats a mark with no id as never retired', () => {
    expect(hintRetired(undefined)).toBe(false)
  })

  it('brings the retired ones back when the hints are switched on again', () => {
    retireHint('login-pin')
    setHintsEnabled(false)
    setHintsEnabled(true)
    // Otherwise "Hinweise einblenden" would appear to do nothing, which reads
    // as a broken switch rather than as hints already seen.
    expect(hintRetired('login-pin')).toBe(false)
  })

  it('survives localStorage throwing, as it does in a private window', () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => { throw new Error('denied') }
    try {
      expect(hintRetired('login-pin')).toBe(false)
      expect(hintsEnabled()).toBe(true)
    } finally {
      Storage.prototype.getItem = original
    }
  })
})

describe('what the overlay puts on screen', () => {
  it('draws a live hint', () => {
    render([PIN])
    expect(captions()).toContain('PIN steht hier')
  })

  it('drops a hint the visitor has already acted on', () => {
    retireHint('login-pin')
    render([PIN, BACK])
    expect(captions()).toEqual(['Zurück zur App'])
  })

  it('removes a hint the moment it retires, without a navigation', () => {
    render([PIN])
    expect(captions()).toContain('PIN steht hier')
    act(() => retireHint('login-pin'))
    expect(captions()).toEqual([])
  })

  it('renders nothing at all when the hints are switched off', () => {
    setHintsEnabled(false)
    render([PIN, BACK])
    expect(host.innerHTML).toBe('')
  })

  it('leaves narrow screens alone, where there is no room beside the control', () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    render([{ ...PIN, minWidth: 940 }])
    expect(host.innerHTML).toBe('')
  })

  it('never swallows a click meant for the control it points at', () => {
    render([PIN])
    const overlay = host.firstElementChild as HTMLElement
    expect(overlay.className).toContain('pointer-events-none')
    expect(overlay.getAttribute('aria-hidden')).toBe('true')
  })

  it('moves a caption that would run off the edge to the other side', () => {
    // jsdom lays nothing out, so the measurement has to be supplied: a real
    // box, 200 wide, whose right edge is far past the window.
    const original = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      return { ...original.call(this), width: 200, right: 99_999, left: 400 } as DOMRect
    }
    try {
      render([{ ...PIN, caption: 'right' }])
      const span = host.querySelector('span') as HTMLElement
      // 'right' is left-full/ml-2; flipped it becomes right-full/mr-2.
      expect(span.className).toContain('right-full')
      expect(span.className).not.toContain('left-full')
    } finally {
      Element.prototype.getBoundingClientRect = original
    }
  })

  it('leaves a caption that fits exactly where it was put', () => {
    render([{ ...PIN, caption: 'right' }])
    const span = host.querySelector('span') as HTMLElement
    expect(span.className).toContain('left-full')
  })

  it('starts transparent, so the screen is read before it is drawn on', () => {
    render([PIN])
    const overlay = host.firstElementChild as HTMLElement
    expect(overlay.className).toContain('opacity-0')
    expect(overlay.className).toContain('transition-opacity')
  })
})
