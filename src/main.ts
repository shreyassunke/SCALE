import 'lenis/dist/lenis.css'
import './style.css'
import { detectPerf } from './utils/perf'
import { createScrollEngine } from './scroll/scrollEngine'
import { createScene } from './scene/Scene'
import { createTextOverlay } from './ui/TextOverlay'

const canvas = document.querySelector<HTMLCanvasElement>('#webgl')
const overlayRoot = document.querySelector<HTMLElement>('#text-overlay')

if (!canvas || !overlayRoot) {
  throw new Error('Missing #webgl or #text-overlay root')
}

const perf = detectPerf()
const scene = createScene(canvas, perf)
const overlay = createTextOverlay(overlayRoot)
const scroll = createScrollEngine()

const resize = () => {
  scene.resize(window.innerWidth, window.innerHeight)
}
resize()
window.addEventListener('resize', resize)

let raf = 0
const clockStart = performance.now()

const tick = () => {
  const time = (performance.now() - clockStart) / 1000
  const state = scroll.getState()
  scene.update(state, time)
  overlay.update(state)
  raf = requestAnimationFrame(tick)
}
raf = requestAnimationFrame(tick)

scroll.onUpdate((state) => {
  overlay.update(state)
})

// Soft cleanup for HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    scroll.destroy()
    overlay.destroy()
    scene.dispose()
  })
}
