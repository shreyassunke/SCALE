import type { ScaleState } from '../scale/logScaleEngine'
import { formatLength } from '../scale/logScaleEngine'

export type FocusOverlay = {
  update: (state: ScaleState) => void
  destroy: () => void
}

export function createFocusOverlay(root: HTMLElement): FocusOverlay {
  root.innerHTML = ''
  root.setAttribute('aria-live', 'polite')

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const nameEl = document.createElement('h1')
  nameEl.className = 'focus-name'
  const blurbEl = document.createElement('p')
  blurbEl.className = 'focus-blurb'
  const scaleEl = document.createElement('p')
  scaleEl.className = 'focus-scale'
  scaleEl.setAttribute('aria-hidden', 'true')

  root.append(nameEl, blurbEl, scaleEl)

  let lastId = ''

  return {
    update: (state) => {
      const { focus, progress, sizeMeters } = state
      if (focus.id !== lastId) {
        lastId = focus.id
        nameEl.textContent = focus.name
        blurbEl.textContent = focus.blurb
        root.dataset.id = focus.id
        if (!reduceMotion) {
          root.classList.remove('focus-swap')
          void root.offsetWidth
          root.classList.add('focus-swap')
        }
      }
      scaleEl.textContent = `${formatLength(sizeMeters)}  ·  ${Math.round(progress * 100)}%`
    },
    destroy: () => {
      root.innerHTML = ''
    },
  }
}
