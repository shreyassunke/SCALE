import type { CosmicObject } from '../content/catalog'
import { logSize } from '../content/catalog'

export type ScaleState = {
  focusIndex: number
  /** Smoothed index for camera (can be fractional while easing) */
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

const HOLD_DELAY_MS = 380
const HOLD_INTERVAL_MS = 160
const WHEEL_THRESHOLD = 48
const SWIPE_THRESHOLD = 42
const INDEX_SMOOTH = 10

export function createLadderNav(catalog: CosmicObject[]): LadderNav {
  const sorted = [...catalog].sort((a, b) => a.sizeMeters - b.sizeMeters)
  if (sorted.length === 0) throw new Error('Cosmic Scale: empty catalog')

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const max = sorted.length - 1
  const earthIdx = sorted.findIndex((o) => o.id === 'earth')
  let targetIndex = earthIdx >= 0 ? earthIdx : Math.min(Math.floor(sorted.length / 2), max)
  let smoothIndex = targetIndex

  let holdTimer: ReturnType<typeof setTimeout> | null = null
  let holdInterval: ReturnType<typeof setInterval> | null = null
  let holdDir: 1 | -1 | 0 = 0
  let wheelAcc = 0
  let wheelLockUntil = 0
  let pointerStartX = 0
  let pointerStartY = 0
  let pointerActive = false

  const clearHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
    if (holdInterval) {
      clearInterval(holdInterval)
      holdInterval = null
    }
    holdDir = 0
  }

  const step = (dir: 1 | -1) => {
    targetIndex = Math.max(0, Math.min(max, targetIndex + dir))
    if (reduceMotion) smoothIndex = targetIndex
  }

  const startHold = (dir: 1 | -1) => {
    clearHold()
    holdDir = dir
    step(dir)
    if (reduceMotion) return
    holdTimer = setTimeout(() => {
      holdInterval = setInterval(() => {
        if (holdDir !== 0) step(holdDir)
      }, HOLD_INTERVAL_MS)
    }, HOLD_DELAY_MS)
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
    if (dir) startHold(dir)
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (!isNavKey(e.code)) return
    e.preventDefault()
    const dir = dirFromCode(e.code)
    if (dir && dir === holdDir) clearHold()
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const now = performance.now()
    if (now < wheelLockUntil) return

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    wheelAcc += delta

    if (Math.abs(wheelAcc) >= WHEEL_THRESHOLD) {
      const dir: 1 | -1 = wheelAcc > 0 ? 1 : -1
      step(dir)
      wheelAcc = 0
      wheelLockUntil = now + 90
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target = e.target as HTMLElement | null
    if (target?.closest('a, button, input, textarea, [data-no-swipe]')) return
    pointerActive = true
    pointerStartX = e.clientX
    pointerStartY = e.clientY
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!pointerActive) return
    pointerActive = false
    const dx = e.clientX - pointerStartX
    const dy = e.clientY - pointerStartY
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return

    if (Math.abs(dx) >= Math.abs(dy)) {
      // Swipe left → larger (forward); swipe right → smaller
      step(dx < 0 ? 1 : -1)
    } else {
      // Swipe down → larger (matches wheel); swipe up → smaller
      step(dy > 0 ? 1 : -1)
    }
  }

  const onPointerCancel = () => {
    pointerActive = false
  }

  const onBlur = () => clearHold()

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
  window.addEventListener('blur', onBlur)

  function buildState(): ScaleState {
    const focusIndex = Math.round(Math.max(0, Math.min(max, smoothIndex)))
    return {
      focusIndex,
      focusIndexSmooth: smoothIndex,
      focus: sorted[focusIndex],
      progress: max === 0 ? 0 : focusIndex / max,
      sizeMeters: sorted[focusIndex].sizeMeters,
    }
  }

  return {
    getState: buildState,
    stepBy: step,
    update: (dt) => {
      if (reduceMotion) {
        smoothIndex = targetIndex
        return buildState()
      }
      const k = 1 - Math.exp(-INDEX_SMOOTH * dt)
      smoothIndex += (targetIndex - smoothIndex) * k
      if (Math.abs(targetIndex - smoothIndex) < 0.001) smoothIndex = targetIndex
      return buildState()
    },
    destroy: () => {
      clearHold()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('blur', onBlur)
    },
  }
}

export function formatLength(m: number): string {
  if (m < 1e-12) return `${(m * 1e15).toPrecision(2)} fm`
  if (m < 1e-9) return `${(m * 1e12).toPrecision(2)} pm`
  if (m < 1e-6) return `${(m * 1e9).toPrecision(2)} nm`
  if (m < 1e-3) return `${(m * 1e6).toPrecision(2)} µm`
  if (m < 1) return `${(m * 1e2).toPrecision(2)} cm`
  if (m < 1e3) return `${m.toPrecision(2)} m`
  if (m < 1e6) return `${(m / 1e3).toPrecision(2)} km`
  if (m < 9.46e15) return `${(m / 1.496e11).toPrecision(2)} AU`
  if (m < 9.46e21) return `${(m / 9.46e15).toPrecision(2)} ly`
  return `${(m / 9.46e21).toPrecision(2)} Mly`
}

export { logSize }
