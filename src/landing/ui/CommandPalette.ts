import gsap from 'gsap'
import { tracks, type Track } from '../tracks'

export type CommandPaletteController = {
  open: () => void
  close: () => void
  destroy: () => void
  isOpen: () => boolean
}

type Options = {
  /** Element that receives focus when the palette closes (browse trigger) */
  returnFocus?: HTMLElement | null
  onNavigate?: (track: Track) => void
}

function statusLabel(status: Track['status']): string {
  return status === 'enter' ? 'Enter' : 'Soon'
}

/** Case-insensitive substring, then loose character-sequence fuzzy */
function scoreMatch(query: string, title: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 1
  const t = title.toLowerCase()
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(q)) return 60

  let ti = 0
  let hits = 0
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi]!
    let found = false
    while (ti < t.length) {
      if (t[ti] === ch) {
        hits++
        ti++
        found = true
        break
      }
      ti++
    }
    if (!found) return 0
  }
  return 20 + hits
}

function filterTracks(query: string): Track[] {
  if (!query.trim()) return [...tracks]
  return tracks
    .map((track) => ({ track, score: scoreMatch(query, track.title) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.track.track - b.track.track)
    .map((x) => x.track)
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(
    'input, button, a[href], [tabindex]:not([tabindex="-1"])',
  )
  return Array.from(nodes).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  )
}

/**
 * Centered search-to-enter overlay. Opens via `/`, Cmd/Ctrl+K, or an external trigger.
 */
export function createCommandPalette(options: Options = {}): CommandPaletteController {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const root = document.createElement('div')
  root.className = 'cmd-palette'
  root.hidden = true
  root.setAttribute('aria-hidden', 'true')

  const backdrop = document.createElement('div')
  backdrop.className = 'cmd-palette__backdrop'
  backdrop.tabIndex = -1

  const dialog = document.createElement('div')
  dialog.className = 'cmd-palette__dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-label', 'Browse all tracks')

  const form = document.createElement('form')
  form.className = 'cmd-palette__form'
  form.setAttribute('role', 'search')
  form.addEventListener('submit', (e) => e.preventDefault())

  const label = document.createElement('label')
  label.className = 'visually-hidden'
  label.htmlFor = 'cmd-palette-input'
  label.textContent = 'Search tracks'

  const input = document.createElement('input')
  input.id = 'cmd-palette-input'
  input.className = 'cmd-palette__input'
  input.type = 'search'
  input.autocomplete = 'off'
  input.spellcheck = false
  input.placeholder = 'Search tracks…'
  input.setAttribute('aria-controls', 'cmd-palette-list')
  input.setAttribute('aria-autocomplete', 'list')

  const kbdHint = document.createElement('span')
  kbdHint.className = 'cmd-palette__kbd'
  kbdHint.setAttribute('aria-hidden', 'true')
  kbdHint.textContent = 'ESC'

  const list = document.createElement('ul')
  list.id = 'cmd-palette-list'
  list.className = 'cmd-palette__list'
  list.setAttribute('role', 'listbox')
  list.setAttribute('aria-label', 'Filtered tracks')

  const empty = document.createElement('p')
  empty.className = 'cmd-palette__empty'
  empty.hidden = true
  empty.textContent = 'No tracks match'

  const live = document.createElement('div')
  live.className = 'visually-hidden'
  live.setAttribute('aria-live', 'polite')
  live.setAttribute('aria-atomic', 'true')

  form.append(label, input, kbdHint)
  dialog.append(form, list, empty, live)
  root.append(backdrop, dialog)
  document.body.append(root)

  let open = false
  let selected = 0
  let filtered: Track[] = [...tracks]
  let lastFocus: HTMLElement | null = null
  const itemEls: HTMLElement[] = []

  const paintSelection = () => {
    itemEls.forEach((el, i) => {
      const on = i === selected
      el.classList.toggle('is-selected', on)
      el.setAttribute('aria-selected', on ? 'true' : 'false')
      if (on) {
        el.scrollIntoView({ block: 'nearest' })
        input.setAttribute('aria-activedescendant', el.id)
      }
    })
  }

  const renderList = () => {
    list.innerHTML = ''
    itemEls.length = 0
    empty.hidden = filtered.length > 0

    filtered.forEach((track, i) => {
      const li = document.createElement('li')
      li.className = `cmd-palette__item cmd-palette__item--${track.status}`
      li.id = `cmd-item-${track.id}`
      li.setAttribute('role', 'option')
      li.setAttribute('aria-selected', 'false')

      const index = document.createElement('span')
      index.className = 'cmd-palette__index'
      index.textContent = track.index

      const title = document.createElement('span')
      title.className = 'cmd-palette__title'
      title.textContent = track.title

      const status = document.createElement('span')
      status.className = 'cmd-palette__status'
      status.textContent = statusLabel(track.status)

      li.append(index, title, status)
      li.addEventListener('pointerenter', () => {
        selected = i
        paintSelection()
      })
      li.addEventListener('click', () => {
        selected = i
        activateSelected()
      })

      list.append(li)
      itemEls.push(li)
    })

    selected = Math.min(selected, Math.max(0, filtered.length - 1))
    paintSelection()
    live.textContent =
      filtered.length === 0
        ? 'No tracks match'
        : `${filtered.length} track${filtered.length === 1 ? '' : 's'}`
  }

  const activateSelected = () => {
    const track = filtered[selected]
    if (!track) return

    if (track.status !== 'enter' || !track.href) {
      const el = itemEls[selected]
      if (el && !reduceMotion) {
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
            ease: 'none',
          },
        )
      }
      return
    }

    options.onNavigate?.(track)
    const href = track.href
    close()
    window.location.href = href
  }

  const onInput = () => {
    filtered = filterTracks(input.value)
    selected = 0
    renderList()
  }

  const onDialogKey = (e: KeyboardEvent) => {
    if (!open) return

    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!filtered.length) return
      selected = (selected + 1) % filtered.length
      paintSelection()
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!filtered.length) return
      selected = (selected - 1 + filtered.length) % filtered.length
      paintSelection()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      activateSelected()
      return
    }

    if (e.key === 'Tab') {
      const focusables = getFocusable(dialog)
      if (!focusables.length) {
        e.preventDefault()
        return
      }
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const onGlobalKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    const tag = target?.tagName
    const typing =
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      target?.isContentEditable === true

    const metaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
    const slash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey

    if (metaK) {
      e.preventDefault()
      if (open) close()
      else openPalette()
      return
    }

    if (slash && !typing && !open) {
      e.preventDefault()
      openPalette()
    }
  }

  const openPalette = () => {
    if (open) return
    open = true
    lastFocus =
      (document.activeElement as HTMLElement | null) ??
      options.returnFocus ??
      null

    filtered = filterTracks('')
    selected = 0
    input.value = ''
    renderList()

    root.hidden = false
    root.setAttribute('aria-hidden', 'false')
    document.documentElement.classList.add('cmd-palette-open')

    if (!reduceMotion) {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: 'power2.out' },
      )
      gsap.fromTo(
        dialog,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' },
      )
    }

    requestAnimationFrame(() => input.focus())
  }

  const close = () => {
    if (!open) return
    open = false
    root.hidden = true
    root.setAttribute('aria-hidden', 'true')
    document.documentElement.classList.remove('cmd-palette-open')

    const restore = lastFocus ?? options.returnFocus ?? null
    if (restore && document.contains(restore)) {
      restore.focus()
    }
  }

  backdrop.addEventListener('click', close)
  input.addEventListener('input', onInput)
  root.addEventListener('keydown', onDialogKey)
  window.addEventListener('keydown', onGlobalKey)

  return {
    open: openPalette,
    close,
    isOpen: () => open,
    destroy: () => {
      window.removeEventListener('keydown', onGlobalKey)
      root.remove()
      document.documentElement.classList.remove('cmd-palette-open')
    },
  }
}
