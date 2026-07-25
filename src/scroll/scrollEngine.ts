import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { SectionKey } from '../content/copy'

gsap.registerPlugin(ScrollTrigger)

export type { SectionKey }

export type ScrollState = {
  section: SectionKey
  progress: number
  /** Continuous dimension float: 0→7 across the journey; coda eases back toward 3 */
  dimension: number
  globalProgress: number
}

export type ScrollEngine = {
  lenis: Lenis
  getState: () => ScrollState
  onUpdate: (cb: (state: ScrollState) => void) => () => void
  destroy: () => void
}

const SECTION_ORDER: SectionKey[] = [
  'intro',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  'coda',
]

/** First portion of a section: morph into this dimension with its title card. */
const ENTER = 0.2

function smooth01(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * Lock visuals to commentary:
 * - First ~20% of a section morphs FROM the previous dimension INTO this one
 *   (so the scene arrives with the title beat).
 * - The rest of the section eases only within [to, holdEnd] and never crosses
 *   the next integer — the following scene cannot appear while this section's
 *   copy is still on screen.
 */
function holdDimension(from: number, to: number, holdEnd: number, progress: number): number {
  if (progress < ENTER) {
    return from + (to - from) * smooth01(progress / ENTER)
  }
  const t = (progress - ENTER) / (1 - ENTER)
  return to + (holdEnd - to) * smooth01(t)
}

function sectionToDimension(section: SectionKey, progress: number): number {
  switch (section) {
    case 'intro':
      // Establish the point; stay in pure 0D
      return holdDimension(0, 0, 0.1, progress)
    case '0':
      // All 0D commentary stays on the point — line must not form yet
      return holdDimension(0, 0, 0.16, progress)
    case '1':
      // Line forms with "1D" title; hold below plane entrance
      return holdDimension(0.16, 1, 1.62, progress)
    case '2':
      return holdDimension(1.62, 2, 2.62, progress)
    case '3':
      return holdDimension(2.62, 3, 3.62, progress)
    case '4':
      return holdDimension(3.62, 4, 4.62, progress)
    case '5':
      return holdDimension(4.62, 5, 5.62, progress)
    case '6':
      return holdDimension(5.62, 6, 6.62, progress)
    case '7':
      return holdDimension(6.62, 7, 7.28, progress)
    case 'coda':
      // Return from the edge of metaphor back into familiar 3-space
      return 7.35 - progress * 4.35
    default:
      return 0
  }
}

/**
 * Lenis + GSAP ScrollTrigger — one shared progress model.
 * Per-section 0–1 maps to a continuous `dimension` float (0→7).
 */
export function createScrollEngine(): ScrollEngine {
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })

  lenis.on('scroll', ScrollTrigger.update)

  const tickerFn = (time: number) => {
    lenis.raf(time * 1000)
  }
  gsap.ticker.add(tickerFn)
  gsap.ticker.lagSmoothing(0)

  const sectionProgress = new Map<SectionKey, number>()
  for (const key of SECTION_ORDER) {
    sectionProgress.set(key, 0)
  }

  let activeSection: SectionKey = 'intro'

  let state: ScrollState = {
    section: 'intro',
    progress: 0,
    dimension: 0,
    globalProgress: 0,
  }

  const listeners = new Set<(s: ScrollState) => void>()

  const emit = () => {
    for (const cb of listeners) cb(state)
  }

  const recompute = () => {
    const progress = sectionProgress.get(activeSection) ?? 0
    const limit = Math.max(lenis.limit, 1)
    const globalProgress = Math.min(1, Math.max(0, lenis.scroll / limit))

    state = {
      section: activeSection,
      progress,
      dimension: sectionToDimension(activeSection, progress),
      globalProgress,
    }
    emit()
  }

  const triggers: ScrollTrigger[] = []

  for (const key of SECTION_ORDER) {
    const el = document.getElementById(`section-${key}`)
    if (!el) continue

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.45,
      onToggle: (self) => {
        if (self.isActive) {
          activeSection = key
          recompute()
        }
      },
      onUpdate: (self) => {
        sectionProgress.set(key, self.progress)
        if (self.isActive) activeSection = key
        recompute()
      },
      onEnter: () => {
        activeSection = key
        recompute()
      },
      onEnterBack: () => {
        activeSection = key
        recompute()
      },
    })
    triggers.push(st)
  }

  ScrollTrigger.refresh()
  recompute()

  return {
    lenis,
    getState: () => state,
    onUpdate: (cb) => {
      listeners.add(cb)
      cb(state)
      return () => {
        listeners.delete(cb)
      }
    },
    destroy: () => {
      gsap.ticker.remove(tickerFn)
      for (const st of triggers) st.kill()
      lenis.destroy()
      listeners.clear()
    },
  }
}
