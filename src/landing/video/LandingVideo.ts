import type { LandingMenuTarget } from '../ui/Menu'

export type LandingVideo = LandingMenuTarget & {
  dispose: () => void
}

/**
 * Full-bleed cinematic hero — loops quietly behind SCALE UI.
 * Grayscale + veil keep strict mono harmony with DESIGN.md.
 */
export function createLandingVideo(video: HTMLVideoElement): LandingVideo {
  video.muted = true
  video.defaultMuted = true
  video.volume = 0
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.setAttribute('muted', '')
  video.preload = 'auto'
  video.loop = true
  video.autoplay = true
  video.setAttribute('autoplay', '')
  video.setAttribute('loop', '')
  video.removeAttribute('controls')
  video.removeAttribute('poster')

  if (!video.getAttribute('src')) {
    video.src = '/landing-hero.mp4'
  }

  let activeTrack: number | null = null
  let disposed = false
  let kickTimer = 0
  let awaitingGesture = false

  const applyIdleLook = () => {
    video.style.filter =
      activeTrack === null
        ? ''
        : 'grayscale(1) brightness(1.06) contrast(1.05)'
  }

  const armGestureResume = () => {
    if (awaitingGesture || disposed) return
    awaitingGesture = true
    const resume = () => {
      awaitingGesture = false
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
      tryPlay()
    }
    window.addEventListener('pointerdown', resume, { once: true })
    window.addEventListener('keydown', resume, { once: true })
  }

  const tryPlay = () => {
    if (disposed || document.hidden) return
    video.muted = true
    video.volume = 0
    video.loop = true
    const play = video.play()
    if (play !== undefined) {
      void play.catch(() => {
        armGestureResume()
      })
    }
  }

  const onPause = () => {
    if (disposed || document.hidden) return
    window.setTimeout(() => {
      if (!disposed && video.paused && !document.hidden) tryPlay()
    }, 80)
  }

  const onVisibility = () => {
    if (!document.hidden) tryPlay()
  }

  const onEnded = () => {
    if (disposed) return
    try {
      video.currentTime = 0
    } catch {
      /* ignore */
    }
    tryPlay()
  }

  video.addEventListener('pause', onPause)
  video.addEventListener('ended', onEnded)
  video.addEventListener('canplay', tryPlay)
  video.addEventListener('loadeddata', tryPlay)
  video.addEventListener('canplaythrough', tryPlay)
  document.addEventListener('visibilitychange', onVisibility)

  // Large hero file: keep kicking until playback is clearly advancing
  let lastTime = -1
  let stallTicks = 0
  kickTimer = window.setInterval(() => {
    if (disposed || document.hidden) return
    if (video.paused) {
      tryPlay()
      return
    }
    if (video.currentTime === lastTime) {
      stallTicks += 1
      if (stallTicks >= 3) tryPlay()
    } else {
      stallTicks = 0
      lastTime = video.currentTime
      if (video.currentTime > 0.5) {
        window.clearInterval(kickTimer)
        kickTimer = 0
      }
    }
  }, 500)

  if (video.readyState === 0) {
    video.load()
  }
  tryPlay()
  applyIdleLook()

  return {
    setActiveTrack: (track) => {
      activeTrack = track
      applyIdleLook()
    },
    dispose: () => {
      disposed = true
      if (kickTimer) window.clearInterval(kickTimer)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('canplay', tryPlay)
      video.removeEventListener('loadeddata', tryPlay)
      video.removeEventListener('canplaythrough', tryPlay)
      document.removeEventListener('visibilitychange', onVisibility)
      video.pause()
    },
  }
}
