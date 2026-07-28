import type { ScaleState } from '../scale/logScaleEngine'
import { formatScaleMetric } from '../scale/logScaleEngine'

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

  root.append(nameEl, blurbEl)

  let lastId = ''

  return {
    update: (state) => {
      const { focus, sizeMeters } = state
      if (focus.id !== lastId) {
        lastId = focus.id
        nameEl.textContent = focus.name
        const metric = formatScaleMetric(
          sizeMeters,
          focus.metricKind ?? (focus.type === 'textureSphere' ? 'diameter' : 'span'),
        )
        blurbEl.textContent = `${focus.blurb} ${metric}.`
        root.dataset.id = focus.id
        if (!reduceMotion) {
          root.classList.remove('focus-swap')
          void root.offsetWidth
          root.classList.add('focus-swap')
        }
      }
    },
    destroy: () => {
      root.innerHTML = ''
    },
  }
}
