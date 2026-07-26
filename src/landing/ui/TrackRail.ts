import gsap from 'gsap'
import { tracks, type Track } from '../tracks'

export type LandingMenuTarget = {
  setActiveTrack: (track: number | null) => void
}

export type TrackRailController = {
  destroy: () => void
  setActiveIndex: (index: number) => void
  getActiveIndex: () => number
  focus: () => void
}

type Options = {
  scene: LandingMenuTarget
  onNavigate?: (track: Track) => void
}

const VISIBLE_ROWS = 5
const OPACITY_NEAR = 1
const OPACITY_FAR = 0.28

function statusLabel(status: Track['status']): string {
  return status === 'enter' ? 'Enter' : 'Soon'
}

function shake(el: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gsap.fromTo(
    el,
    { x: 0 },
    {
      duration: 0.35,
      keyframes: [
        { x: -4, duration: 0.05 },
        { x: 4, duration: 0.05 },
        { x: -3, duration: 0.05 },
        { x: 3, duration: 0.05 },
        { x: 0, duration: 0.08 },
      ],
    },
  )
}

function navigateTo(track: Track, control: HTMLElement, scene: LandingMenuTarget) {
  if (track.status !== 'enter' || !track.href) {
    shake(control)
    return
  }

  scene.setActiveTrack(track.track)
  const href = track.href
  gsap.to(control, {
    opacity: 0.4,
    duration: 0.35,
    ease: 'power2.out',
    onComplete: () => {
      window.location.href = href
    },
  })
}

/**
 * Scrollable track rail — top-aligned active row (starts at 01).
 * Highlight is dim vs white only (selected / hovered).
 */
export function createTrackRail(
  root: HTMLElement,
  { scene, onNavigate }: Options,
): TrackRailController {
  root.innerHTML = ''
  root.classList.add('track-rail')
  root.setAttribute('tabindex', '0')
  root.setAttribute('role', 'listbox')
  root.setAttribute('aria-label', 'Tracks')
  root.setAttribute('aria-activedescendant', '')

  const viewport = document.createElement('div')
  viewport.className = 'track-rail__viewport'

  const list = document.createElement('ul')
  list.className = 'track-rail__list'
  list.setAttribute('role', 'presentation')

  const live = document.createElement('div')
  live.className = 'visually-hidden'
  live.setAttribute('aria-live', 'polite')
  live.setAttribute('aria-atomic', 'true')

  const rowEls: HTMLElement[] = []
  const controlEls: HTMLElement[] = []
  let rowOffsets: number[] = []
  let activeIndex = 0
  let hoverIndex: number | null = null
  let rowHeight = 0
  let raf = 0
  let scrollingProgrammatic = false
  let ready = false
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  for (const track of tracks) {
    const li = document.createElement('li')
    li.className = `track-row track-row--${track.status}`
    li.id = `track-row-${track.id}`
    li.setAttribute('role', 'option')
    li.setAttribute('aria-selected', 'false')

    const control = document.createElement(track.status === 'enter' ? 'a' : 'button')
    control.className = 'track-row__control'
    if (track.status === 'enter' && track.href) {
      ;(control as HTMLAnchorElement).href = track.href
      control.setAttribute(
        'aria-label',
        track.blurb ? `Enter ${track.title}. ${track.blurb}` : `Enter ${track.title}`,
      )
    } else {
      ;(control as HTMLButtonElement).type = 'button'
      control.setAttribute('aria-disabled', 'true')
      control.setAttribute(
        'aria-label',
        track.blurb
          ? `${track.title}, coming soon. ${track.blurb}`
          : `${track.title}, coming soon`,
      )
    }
    control.tabIndex = -1

    const index = document.createElement('span')
    index.className = 'track-row__index'
    index.textContent = track.index

    const label = document.createElement('span')
    label.className = 'track-row__label'
    label.textContent = track.title

    const status = document.createElement('span')
    status.className = 'track-row__status'
    status.textContent = statusLabel(track.status)

    const blurb = document.createElement('span')
    blurb.className = 'track-row__blurb'
    blurb.textContent = track.blurb ?? ''

    control.append(index, label, status, blurb)
    li.append(control)
    list.append(li)
    rowEls.push(li)
    controlEls.push(control)

    const i = tracks.indexOf(track)

    const onEnter = () => {
      hoverIndex = i
      scene.setActiveTrack(track.track)
      applyOpacities()
    }
    const onLeave = () => {
      if (hoverIndex === i) hoverIndex = null
      const t = tracks[activeIndex]
      scene.setActiveTrack(t ? t.track : null)
      applyOpacities()
    }

    control.addEventListener('pointerenter', onEnter)
    control.addEventListener('pointerleave', onLeave)
    control.addEventListener('focus', onEnter)
    control.addEventListener('blur', onLeave)

    control.addEventListener('click', (e) => {
      e.preventDefault()
      setActiveIndex(i, true)
      if (onNavigate) onNavigate(track)
      navigateTo(track, control, scene)
    })
  }

  viewport.append(list)
  root.append(viewport, live)

  /** Cache row offsets once per layout — avoid getBoundingClientRect on scroll. */
  const measure = () => {
    const first = rowEls[0]
    if (!first) return
    rowHeight = first.offsetHeight
    if (rowHeight <= 0) return
    rowOffsets = rowEls.map((row) => row.offsetTop)
    viewport.style.height = `${VISIBLE_ROWS * rowHeight}px`
  }

  const nearestToTop = (): number => {
    if (!rowHeight || !rowOffsets.length) return 0
    const top = viewport.scrollTop
    let nearest = 0
    let nearestDist = Infinity
    for (let i = 0; i < rowOffsets.length; i++) {
      const dist = Math.abs(rowOffsets[i] - top)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    }
    return nearest
  }

  const applyOpacities = () => {
    if (!rowHeight) return
    const nearest = nearestToTop()

    rowEls.forEach((row, i) => {
      const highlighted = hoverIndex === i || (hoverIndex === null && i === nearest)
      const opacity = highlighted ? OPACITY_NEAR : OPACITY_FAR

      row.style.setProperty('--row-opacity', String(opacity))
      row.classList.toggle('is-active', highlighted)
      row.setAttribute('aria-selected', i === nearest ? 'true' : 'false')
      controlEls[i]?.classList.toggle('is-active', highlighted)
      controlEls[i]?.classList.toggle('is-hover', hoverIndex === i)
    })

    if (nearest !== activeIndex) {
      activeIndex = nearest
      root.setAttribute('aria-activedescendant', rowEls[activeIndex]?.id ?? '')
      const t = tracks[activeIndex]
      if (t) {
        live.textContent = `${t.index} ${t.title}, ${statusLabel(t.status)}`
        if (hoverIndex === null) scene.setActiveTrack(t.track)
      }
    }
  }

  const scrollToIndex = (index: number, smooth: boolean) => {
    const clamped = Math.max(0, Math.min(tracks.length - 1, index))
    if (!rowHeight || rowOffsets[clamped] == null) return

    scrollingProgrammatic = true
    const target = Math.max(0, rowOffsets[clamped])

    if (reduceMotion || !smooth) {
      viewport.scrollTop = target
      scrollingProgrammatic = false
      applyOpacities()
      return
    }

    const proxy = { y: viewport.scrollTop }
    gsap.killTweensOf(proxy)
    gsap.to(proxy, {
      y: target,
      duration: 0.4,
      ease: 'power3.out',
      onUpdate: () => {
        viewport.scrollTop = proxy.y
        applyOpacities()
      },
      onComplete: () => {
        scrollingProgrammatic = false
        applyOpacities()
      },
    })
  }

  const setActiveIndex = (index: number, smooth = true) => {
    scrollToIndex(index, smooth)
  }

  const onScroll = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      raf = 0
      applyOpacities()
    })
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    viewport.scrollTop += e.deltaY
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(activeIndex + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(activeIndex - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(tracks.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const track = tracks[activeIndex]
      const control = controlEls[activeIndex]
      if (track && control) {
        if (onNavigate) onNavigate(track)
        navigateTo(track, control, scene)
      }
    }
  }

  const onFocus = () => {
    root.classList.add('is-focused')
    const t = tracks[activeIndex]
    if (t) scene.setActiveTrack(t.track)
  }

  const onBlur = () => {
    root.classList.remove('is-focused')
  }

  const lockToFirst = () => {
    scrollingProgrammatic = true
    measure()
    viewport.scrollTop = 0
    activeIndex = 0
    applyOpacities()
    root.setAttribute('aria-activedescendant', rowEls[0]?.id ?? '')
    const first = tracks[0]
    if (first) {
      live.textContent = `${first.index} ${first.title}, ${statusLabel(first.status)}`
      scene.setActiveTrack(first.track)
    }
    // Release after layout/snap side-effects settle
    requestAnimationFrame(() => {
      viewport.scrollTop = 0
      scrollingProgrammatic = false
      applyOpacities()
      ready = true
    })
  }

  lockToFirst()
  requestAnimationFrame(lockToFirst)
  // Fonts / late layout can shift row metrics after first paint
  void document.fonts?.ready?.then(() => lockToFirst())

  if (!reduceMotion) {
    gsap.from(controlEls, {
      opacity: 0,
      y: 16,
      duration: 0.9,
      stagger: 0.06,
      ease: 'power3.out',
      delay: 0.45,
      onComplete: () => lockToFirst(),
    })
  }

  viewport.addEventListener('scroll', onScroll, { passive: true })
  root.addEventListener('wheel', onWheel, { passive: false })
  root.addEventListener('keydown', onKeyDown)
  root.addEventListener('focus', onFocus)
  root.addEventListener('blur', onBlur)

  const onResize = () => {
    const keep = activeIndex
    measure()
    scrollToIndex(keep, false)
  }
  window.addEventListener('resize', onResize)

  let settleTimer = 0
  viewport.addEventListener(
    'scroll',
    () => {
      if (scrollingProgrammatic || !ready) return
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        if (!rowHeight) return
        const nearest = nearestToTop()
        const offset = rowOffsets[nearest]
        if (offset == null) return
        if (Math.abs(offset - viewport.scrollTop) > 2) {
          scrollToIndex(nearest, true)
        }
      }, 80)
    },
    { passive: true },
  )

  return {
    destroy: () => {
      if (raf) cancelAnimationFrame(raf)
      window.clearTimeout(settleTimer)
      window.removeEventListener('resize', onResize)
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('keydown', onKeyDown)
      root.removeEventListener('focus', onFocus)
      root.removeEventListener('blur', onBlur)
      root.innerHTML = ''
      root.classList.remove('track-rail', 'is-focused')
      root.removeAttribute('tabindex')
      root.removeAttribute('role')
      root.removeAttribute('aria-label')
      root.removeAttribute('aria-activedescendant')
    },
    setActiveIndex,
    getActiveIndex: () => activeIndex,
    focus: () => root.focus(),
  }
}
