import './style.css'
import gsap from 'gsap'
import { createCoordinates } from './ui/Coordinates'
import { createMenu } from './ui/Menu'
import { createLandingVideo } from './video/LandingVideo'

const video = document.querySelector<HTMLVideoElement>('#hero-video')
const nav = document.querySelector<HTMLElement>('#env-nav')
const brand = document.querySelector<HTMLElement>('.brand')
const tagline = document.querySelector<HTMLElement>('.tagline')
const coord = document.querySelector<HTMLElement>('#coord')
const chrome = document.querySelectorAll('.chrome')

if (!video || !nav || !coord) {
  throw new Error('Missing landing roots')
}

const bg = createLandingVideo(video)
const menu = createMenu(nav, bg)
const coordinates = createCoordinates(coord)

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Entrance: brand first, then chrome — delayed slightly so the film can start
const entranceTargets = [brand, tagline, ...chrome].filter(
  (el): el is HTMLElement => el != null,
)
if (!reduceMotion && entranceTargets.length) {
  gsap.set(entranceTargets, { opacity: 0, y: 12 })
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.8 })
  if (brand) tl.to(brand, { opacity: 1, y: 0, duration: 1.2 }, 0)
  if (tagline) tl.to(tagline, { opacity: 1, y: 0, duration: 1 }, 0.35)
  if (chrome.length) tl.to(chrome, { opacity: 1, y: 0, duration: 0.75, stagger: 0.05 }, 0.55)
} else {
  gsap.set(entranceTargets, { opacity: 1, y: 0 })
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    coordinates.destroy()
    menu.destroy()
    bg.dispose()
  })
}
