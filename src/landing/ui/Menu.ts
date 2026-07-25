import gsap from 'gsap'
import { environments } from '../environments'

export type LandingMenuTarget = {
  setActiveTrack: (track: number | null) => void
}

export type MenuController = {
  destroy: () => void
}

export function createMenu(
  root: HTMLElement,
  scene: LandingMenuTarget,
): MenuController {
  root.innerHTML = ''
  const list = document.createElement('ul')
  list.className = 'env-list'
  list.setAttribute('role', 'list')

  const items: HTMLElement[] = []

  for (const env of environments) {
    const li = document.createElement('li')
    li.className = `env-item env-item--${env.status}`

    const control = document.createElement(env.status === 'live' ? 'a' : 'button')
    control.className = 'env-control'
    if (env.status === 'live' && env.href) {
      ;(control as HTMLAnchorElement).href = env.href
      control.setAttribute('aria-label', `Enter ${env.label}`)
    } else {
      ;(control as HTMLButtonElement).type = 'button'
      control.setAttribute('aria-disabled', 'true')
      control.setAttribute('aria-label', `${env.label}, coming soon`)
    }

    const index = document.createElement('span')
    index.className = 'env-index'
    index.textContent = String(env.track + 1).padStart(2, '0')

    const label = document.createElement('span')
    label.className = 'env-label'
    label.textContent = env.label

    const status = document.createElement('span')
    status.className = 'env-status'
    status.textContent = env.status === 'live' ? 'Enter' : 'Soon'

    const blurb = document.createElement('span')
    blurb.className = 'env-blurb'
    blurb.textContent = env.blurb

    control.append(index, label, status, blurb)
    li.append(control)
    list.append(li)
    items.push(control)

    const activate = () => scene.setActiveTrack(env.track)
    const clear = () => scene.setActiveTrack(null)

    control.addEventListener('pointerenter', activate)
    control.addEventListener('focus', activate)
    control.addEventListener('pointerleave', clear)
    control.addEventListener('blur', clear)

    if (env.status === 'soon') {
      control.addEventListener('click', (e) => {
        e.preventDefault()
      })
    }

    if (env.status === 'live' && env.href) {
      control.addEventListener('click', (e) => {
        // Soft handoff: brighten track then navigate
        e.preventDefault()
        scene.setActiveTrack(env.track)
        const href = env.href!
        gsap.to(control, {
          opacity: 0.4,
          duration: 0.35,
          ease: 'power2.out',
          onComplete: () => {
            window.location.href = href
          },
        })
      })
    }
  }

  root.append(list)

  // Entrance
  gsap.from(items, {
    opacity: 0,
    y: 16,
    duration: 0.9,
    stagger: 0.08,
    ease: 'power3.out',
    delay: 0.45,
  })

  return {
    destroy: () => {
      root.innerHTML = ''
    },
  }
}
