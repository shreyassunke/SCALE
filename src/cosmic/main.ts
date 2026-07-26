import './style.css'
import { detectPerf } from '../utils/perf'
import { cosmicCatalog } from './content/catalog'
import { createLadderNav } from './scale/logScaleEngine'
import { createCosmicScene } from './scene/CosmicScene'
import { createFocusOverlay } from './ui/FocusOverlay'

const canvas = document.querySelector<HTMLCanvasElement>('#webgl')
const overlayRoot = document.querySelector<HTMLElement>('#focus-overlay')
const hint = document.querySelector<HTMLElement>('#nav-hint')
const loading = document.querySelector<HTMLElement>('#loading')
const stepPrev = document.querySelector<HTMLButtonElement>('#step-prev')
const stepNext = document.querySelector<HTMLButtonElement>('#step-next')

if (!canvas || !overlayRoot) {
  throw new Error('Missing #webgl or #focus-overlay')
}

const perf = detectPerf()
const scene = createCosmicScene(canvas, cosmicCatalog, perf)
const overlay = createFocusOverlay(overlayRoot)

let nav: ReturnType<typeof createLadderNav> | null = null
let ladderMax = 0
let lastStepperIndex = -1
let raf = 0
let last = performance.now()

const resize = () => {
  scene.resize(window.innerWidth, window.innerHeight)
}
resize()
window.addEventListener('resize', resize)

const syncStepper = (focusIndex: number) => {
  if (focusIndex === lastStepperIndex) return
  lastStepperIndex = focusIndex
  if (stepPrev) stepPrev.disabled = focusIndex <= 0
  if (stepNext) stepNext.disabled = focusIndex >= ladderMax
}

const hideHint = () => {
  if (hint) hint.dataset.visible = 'false'
}

void scene.ready.then((loaded) => {
  if (loading) {
    loading.dataset.state = 'done'
    loading.setAttribute('aria-hidden', 'true')
  }
  if (loaded.length === 0) {
    if (loading) {
      loading.textContent = 'No cosmic assets loaded.'
      loading.dataset.state = 'error'
    }
    return
  }
  nav = createLadderNav(loaded)
  ladderMax = Math.max(0, loaded.length - 1)
  if (hint) hint.dataset.visible = 'true'
  syncStepper(nav.getState().focusIndex)

  window.addEventListener('keydown', hideHint, { once: true })
  window.addEventListener('wheel', hideHint, { once: true, passive: true })
  window.addEventListener('pointerdown', hideHint, { once: true })

  stepPrev?.addEventListener('click', () => {
    nav?.stepBy(-1)
    hideHint()
  })
  stepNext?.addEventListener('click', () => {
    nav?.stepBy(1)
    hideHint()
  })
})

const tick = (now: number) => {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  const time = now / 1000
  if (nav) {
    const state = nav.update(dt)
    scene.update(state, time, dt)
    overlay.update(state)
    syncStepper(state.focusIndex)
  } else {
    scene.update(
      {
        focusIndex: 0,
        focusIndexSmooth: 0,
        focus: cosmicCatalog[0],
        progress: 0,
        sizeMeters: cosmicCatalog[0]?.sizeMeters ?? 1,
      },
      time,
      dt,
    )
  }
  raf = requestAnimationFrame(tick)
}
raf = requestAnimationFrame(tick)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    nav?.destroy()
    overlay.destroy()
    scene.dispose()
  })
}
