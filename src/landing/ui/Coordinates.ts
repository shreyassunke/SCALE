export type CoordinatesController = {
  destroy: () => void
}

type AxisEls = {
  x: HTMLElement
  y: HTMLElement
}

const EPSILON = 0.001
const LERP = 0.12

/** Live HUD readout of pointer position on the landing plane (0–100 × 0–100). */
export function createCoordinates(root: HTMLElement): CoordinatesController {
  const xEl = root.querySelector<HTMLElement>('[data-axis="x"]')
  const yEl = root.querySelector<HTMLElement>('[data-axis="y"]')
  if (!xEl || !yEl) {
    throw new Error('Coordinate axis nodes missing')
  }
  const els: AxisEls = { x: xEl, y: yEl }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const target = { x: 50, y: 50 }
  const current = { x: 50, y: 50 }
  let lastX = ''
  let lastY = ''
  let raf = 0
  let running = false

  const format = (n: number) => n.toFixed(2)

  const paint = (x: number, y: number) => {
    const xs = format(x)
    const ys = format(y)
    if (xs !== lastX) {
      els.x.textContent = xs
      lastX = xs
    }
    if (ys !== lastY) {
      els.y.textContent = ys
      lastY = ys
    }
  }

  const stop = () => {
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    running = false
  }

  const tick = () => {
    const snap = reduceMotion.matches
    if (snap) {
      current.x = target.x
      current.y = target.y
    } else {
      current.x += (target.x - current.x) * LERP
      current.y += (target.y - current.y) * LERP
    }

    paint(current.x, current.y)

    const settled =
      Math.abs(target.x - current.x) < EPSILON &&
      Math.abs(target.y - current.y) < EPSILON

    if (settled) {
      current.x = target.x
      current.y = target.y
      paint(current.x, current.y)
      stop()
      return
    }

    raf = requestAnimationFrame(tick)
  }

  const kick = () => {
    if (running) return
    running = true
    raf = requestAnimationFrame(tick)
  }

  const onPointer = (e: PointerEvent) => {
    const w = window.innerWidth || 1
    const h = window.innerHeight || 1
    target.x = Math.min(100, Math.max(0, (e.clientX / w) * 100))
    target.y = Math.min(100, Math.max(0, (e.clientY / h) * 100))
    kick()
  }

  // Seed DOM to center so first paint matches the instrument rest state.
  paint(50, 50)

  window.addEventListener('pointermove', onPointer, { passive: true })

  return {
    destroy: () => {
      stop()
      window.removeEventListener('pointermove', onPointer)
    },
  }
}
