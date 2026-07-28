/**
 * Cosmic Scale nav — neal.fun/size-of-space continuous scale scroll.
 *
 * Scroll/drag: direct 1:1 scale (already satisfactory).
 * Arrow keys: fixed-duration ease between object centers (neal object-center pan).
 * Camera hard-locks to layout(scale) — never ease the camera itself.
 */
import type { CosmicObject } from '../content/catalog'
import { logSize } from '../content/catalog'

export type ScaleState = {
  focusIndex: number
  /** Continuous ladder position (can be fractional while scrolling) */
  focusIndexSmooth: number
  focus: CosmicObject
  progress: number
  sizeMeters: number
}

export type LadderNav = {
  getState: () => ScaleState
  update: (dt: number) => ScaleState
  stepBy: (dir: 1 | -1) => void
  destroy: () => void
}

/** Duration of one arrow-key pan from object center → next center (base) */
const ARROW_PAN_MS = 780
/** Extra duration scaled by log size-jump (big leaps get a longer Neal zoom) */
const ARROW_PAN_LOG_MS = 220
/** Pause between chained pans while a key is held */
const HOLD_GAP_MS = 100
/** Wheel → rung sensitivity */
const WHEEL_SCALE = 0.0032
/** Drag px → rung sensitivity */
const DRAG_SCALE = 0.0045
/** Soft settle onto integer rungs when idle (scroll only) */
const SETTLE_RATE = 2.8
const SETTLE_IDLE_MS = 180

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function createLadderNav(catalog: CosmicObject[]): LadderNav {
  const sorted = [...catalog].sort((a, b) => a.sizeMeters - b.sizeMeters)
  if (sorted.length === 0) throw new Error('Cosmic Scale: empty catalog')

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const max = sorted.length - 1
  const earthIdx = sorted.findIndex((o) => o.id === 'earth')
  const start = earthIdx >= 0 ? earthIdx : Math.min(Math.floor(sorted.length / 2), max)

  let scale = start
  let holdDir: 1 | -1 | 0 = 0
  let lastInputAt = performance.now()
  let pointerActive = false
  let pointerId = -1
  let lastPointerX = 0
  let lastPointerY = 0

  let panActive = false
  let panFrom = start
  let panTo = start
  let panStartedAt = 0
  let panDurationMs = ARROW_PAN_MS
  let panQueuedDir: 1 | -1 | 0 = 0
  let holdResumeAt = 0

  const clampScale = (v: number) => Math.max(0, Math.min(max, v))

  const markInput = () => {
    lastInputAt = performance.now()
  }

  const panDurationFor = (fromIdx: number, toIdx: number) => {
    const a = sorted[Math.max(0, Math.min(max, Math.round(fromIdx)))].sizeMeters
    const b = sorted[Math.max(0, Math.min(max, Math.round(toIdx)))].sizeMeters
    const logJump = Math.abs(Math.log(Math.max(b, 1e-30) / Math.max(a, 1e-30)))
    return ARROW_PAN_MS + Math.min(1.2, logJump * 0.15) * ARROW_PAN_LOG_MS
  }

  const startPan = (dir: 1 | -1) => {
    const from = panActive ? panTo : scale
    const next = dir > 0 ? Math.floor(from + 1e-4) + 1 : Math.ceil(from - 1e-4) - 1
    const clamped = clampScale(next)
    if (Math.abs(clamped - from) < 1e-4) return

    if (reduceMotion) {
      scale = clamped
      panActive = false
      panQueuedDir = 0
      markInput()
      return
    }

    panFrom = from
    panTo = clamped
    panDurationMs = panDurationFor(from, clamped)
    panStartedAt = performance.now()
    panActive = true
    scale = panFrom
    markInput()
  }

  const step = (dir: 1 | -1) => {
    if (panActive) {
      panQueuedDir = dir
      return
    }
    startPan(dir)
  }

  const isNavKey = (code: string) =>
    code === 'ArrowRight' ||
    code === 'ArrowLeft' ||
    code === 'ArrowUp' ||
    code === 'ArrowDown' ||
    code === 'KeyD' ||
    code === 'KeyA' ||
    code === 'KeyW' ||
    code === 'KeyS'

  const dirFromCode = (code: string): 1 | -1 | 0 => {
    if (code === 'ArrowRight' || code === 'ArrowUp' || code === 'KeyD' || code === 'KeyW') return 1
    if (code === 'ArrowLeft' || code === 'ArrowDown' || code === 'KeyA' || code === 'KeyS') return -1
    return 0
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isNavKey(e.code)) return
    e.preventDefault()
    if (e.repeat) return
    const dir = dirFromCode(e.code)
    if (!dir) return
    holdDir = dir
    holdResumeAt = 0
    step(dir)
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (!isNavKey(e.code)) return
    e.preventDefault()
    const dir = dirFromCode(e.code)
    if (dir && dir === holdDir) {
      holdDir = 0
      panQueuedDir = 0
      holdResumeAt = 0
    }
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    panActive = false
    panQueuedDir = 0
    holdResumeAt = 0
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    scale = clampScale(scale + delta * WHEEL_SCALE)
    markInput()
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target = e.target as HTMLElement | null
    if (target?.closest('a, button, input, textarea, [data-no-swipe]')) return
    panActive = false
    panQueuedDir = 0
    holdResumeAt = 0
    pointerActive = true
    pointerId = e.pointerId
    lastPointerX = e.clientX
    lastPointerY = e.clientY
    try {
      ;(e.target as HTMLElement)?.setPointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!pointerActive || e.pointerId !== pointerId) return
    const dx = e.clientX - lastPointerX
    const dy = e.clientY - lastPointerY
    lastPointerX = e.clientX
    lastPointerY = e.clientY
    if (Math.abs(dx) >= Math.abs(dy)) {
      scale = clampScale(scale - dx * DRAG_SCALE)
    } else {
      scale = clampScale(scale + dy * DRAG_SCALE)
    }
    markInput()
  }

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    pointerActive = false
    pointerId = -1
  }

  const onPointerCancel = () => {
    pointerActive = false
    pointerId = -1
  }

  const onBlur = () => {
    holdDir = 0
    panQueuedDir = 0
    panActive = false
    holdResumeAt = 0
    pointerActive = false
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
  window.addEventListener('blur', onBlur)

  function buildState(): ScaleState {
    const focusIndex = Math.round(Math.max(0, Math.min(max, scale)))
    return {
      focusIndex,
      focusIndexSmooth: scale,
      focus: sorted[focusIndex],
      progress: max === 0 ? 0 : focusIndex / max,
      sizeMeters: sorted[focusIndex].sizeMeters,
    }
  }

  return {
    getState: buildState,
    stepBy: step,
    update: (dt) => {
      const now = performance.now()

      if (panActive) {
        const t = Math.min(1, (now - panStartedAt) / panDurationMs)
        scale = panFrom + (panTo - panFrom) * easeInOutCubic(t)
        if (t >= 1) {
          scale = panTo
          panActive = false
          const nextDir = panQueuedDir || (holdDir !== 0 ? holdDir : 0)
          panQueuedDir = 0
          if (nextDir !== 0) {
            holdResumeAt = now + HOLD_GAP_MS
            panQueuedDir = nextDir
          }
        }
      } else if (panQueuedDir !== 0 && holdResumeAt > 0 && now >= holdResumeAt) {
        panQueuedDir = 0
        holdResumeAt = 0
        if (holdDir !== 0) startPan(holdDir)
      }

      // Scroll settle onto nearest rung when idle (not during arrow pan)
      const idle = now - lastInputAt > SETTLE_IDLE_MS
      if (idle && !panActive && holdDir === 0 && !pointerActive && !reduceMotion) {
        const nearest = Math.round(scale)
        const k = 1 - Math.exp(-SETTLE_RATE * dt)
        scale += (nearest - scale) * k
        if (Math.abs(nearest - scale) < 0.001) scale = nearest
      }

      scale = clampScale(scale)
      return buildState()
    },
    destroy: () => {
      holdDir = 0
      panActive = false
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('blur', onBlur)
    },
  }
}

/** Pretty length from meters — same ladder used for visual scale. */
export function formatLength(m: number): string {
  if (m < 1e-12) return `${(m * 1e15).toPrecision(2)} fm`
  if (m < 1e-9) return `${(m * 1e12).toPrecision(2)} pm`
  if (m < 1e-6) return `${(m * 1e9).toPrecision(2)} nm`
  if (m < 1e-3) return `${(m * 1e6).toPrecision(2)} µm`
  if (m < 1) return `${(m * 1e2).toPrecision(2)} cm`
  if (m < 1e3) return `${m.toPrecision(2)} m`
  // Prefer km through solar-system scales (Sun ~1.4e9 m); AU only beyond that
  if (m < 1e10) return formatKilometers(m)
  if (m < 9.46e15) return `${(m / 1.496e11).toPrecision(2)} AU`
  if (m < 9.46e21) return `${(m / 9.46e15).toPrecision(2)} ly`
  return `${(m / 9.46e21).toPrecision(2)} Mly`
}

function formatKilometers(m: number): string {
  const km = m / 1e3
  if (km >= 100) return `${Math.round(km).toLocaleString('en-US')} km`
  if (km >= 10) return `${km.toFixed(0)} km`
  return `${km.toPrecision(2)} km`
}

/**
 * Metric phrase for the focus subtitle — driven by sizeMeters (scale source of truth).
 */
export function formatScaleMetric(
  sizeMeters: number,
  kind: 'diameter' | 'height' | 'span' = 'span',
): string {
  const len = formatLength(sizeMeters)
  if (kind === 'diameter') return `diameter ~${len}`
  if (kind === 'height') return `~${len} tall`
  return `~${len} across`
}

export { logSize }
