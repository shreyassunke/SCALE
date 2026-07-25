import { copyBeats, dimensionLabels, type CopyBeat } from '../content/copy'
import type { ScrollState, SectionKey } from '../scroll/scrollEngine'

function opacityForBeat(beat: CopyBeat, section: SectionKey, progress: number): number {
  if (beat.section !== section) return 0
  const span = beat.span ?? 0.35
  const half = span / 2
  const dist = Math.abs(progress - beat.at)
  if (dist >= half) return 0
  const t = 1 - dist / half
  return t * t * (3 - 2 * t)
}

/** Nearest beat in the active section — keeps copy on-screen between peaks. */
function resolveBeat(section: SectionKey, progress: number): { beat: CopyBeat; opacity: number } {
  let best: CopyBeat | null = null
  let bestOpacity = 0

  for (const beat of copyBeats) {
    const o = opacityForBeat(beat, section, progress)
    if (o > bestOpacity) {
      bestOpacity = o
      best = beat
    }
  }

  if (best && bestOpacity > 0.02) {
    // Keep painted text at full opacity so contrast never stacks below WCAG.
    return { beat: best, opacity: 1 }
  }

  const inSection = copyBeats.filter((b) => b.section === section)
  const pool = inSection.length > 0 ? inSection : copyBeats
  let nearest = pool[0]
  let nearestDist = Math.abs(progress - nearest.at)
  for (const beat of pool) {
    const dist = Math.abs(progress - beat.at)
    if (dist < nearestDist) {
      nearest = beat
      nearestDist = dist
    }
  }

  return { beat: nearest, opacity: 1 }
}

function fillBeat(el: HTMLElement, beat: CopyBeat) {
  el.innerHTML = ''
  el.dataset.id = beat.id

  if (beat.tag) {
    const tag = document.createElement('p')
    tag.className = 'tag'
    tag.textContent = beat.tag
    el.appendChild(tag)
  }

  if (beat.title) {
    const h = document.createElement('h2')
    h.textContent = beat.title
    el.appendChild(h)
  }

  const p = document.createElement('p')
  p.textContent = beat.body
  el.appendChild(p)

  if (beat.aside) {
    const aside = document.createElement('p')
    aside.className = 'aside'
    aside.textContent = beat.aside
    el.appendChild(aside)
  }
}

export type TextOverlay = {
  update: (state: ScrollState) => void
  destroy: () => void
}

export function createTextOverlay(root: HTMLElement): TextOverlay {
  root.innerHTML = ''
  root.classList.add('text-overlay')

  // Single live article — inactive copy is not left at opacity 0 in the DOM.
  const el = document.createElement('article')
  el.className = 'copy-beat active'
  root.appendChild(el)

  let currentId: string | null = null

  const dimLabel = document.getElementById('dim-label')
  const progressFill = document.getElementById('progress-fill')

  const apply = (state: ScrollState) => {
    const { beat, opacity } = resolveBeat(state.section, state.progress)

    if (currentId !== beat.id) {
      currentId = beat.id
      fillBeat(el, beat)
    }

    el.style.opacity = String(opacity)
    el.style.visibility = 'visible'
    el.classList.add('active')

    if (dimLabel) {
      dimLabel.textContent = dimensionLabels[state.section] ?? 'Intro'
    }
    if (progressFill) {
      progressFill.style.transform = `scaleX(${state.globalProgress})`
    }
  }

  // Visible at rest before the first scroll tick.
  apply({
    section: 'intro',
    progress: 0,
    dimension: 0,
    globalProgress: 0,
  })

  const destroy = () => {
    root.innerHTML = ''
    currentId = null
  }

  return { update: apply, destroy }
}
