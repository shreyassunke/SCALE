/**
 * Live light-room for SCALE — samples hero video luminance and drives
 * metallic specular CSS vars so the brand is lit by the same room as the film.
 */

export type BrandLightRoom = {
  dispose: () => void
}

type Smooth = {
  lx: number
  ly: number
  intensity: number
  angle: number
  glow: number
  ox: number
  oy: number
}

type BrandBox = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  cx: number
  cy: number
}

const SAMPLE_W = 64
const SAMPLE_H = 36
/** ~14fps — enough for film continuity without thrashing the main thread */
const TICK_MS = 72
const SMOOTH = 0.22

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function shortestAngleLerp(from: number, to: number, t: number) {
  const d = ((to - from + 540) % 360) - 180
  return from + d * t
}

/** Source crop for object-fit: cover into a destination aspect. */
function coverCrop(
  srcW: number,
  srcH: number,
  dstAspect: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const srcAspect = srcW / srcH
  if (srcAspect > dstAspect) {
    const sw = srcH * dstAspect
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh: srcH }
  }
  const sh = srcW / dstAspect
  return { sx: 0, sy: (srcH - sh) / 2, sw: srcW, sh }
}

function readBrandBox(brand: HTMLElement): BrandBox {
  const r = brand.getBoundingClientRect()
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
    cx: (r.left + r.right) * 0.5,
    cy: (r.top + r.bottom) * 0.5,
  }
}

function applyVars(brand: HTMLElement, s: Smooth) {
  brand.style.setProperty('--brand-lx', s.lx.toFixed(3))
  brand.style.setProperty('--brand-ly', s.ly.toFixed(3))
  brand.style.setProperty('--brand-i', s.intensity.toFixed(3))
  brand.style.setProperty('--brand-angle', `${s.angle.toFixed(1)}deg`)
  brand.style.setProperty('--brand-glow', s.glow.toFixed(3))
  brand.style.setProperty('--brand-ox', s.ox.toFixed(2))
  brand.style.setProperty('--brand-oy', s.oy.toFixed(2))
}

function clearVars(brand: HTMLElement) {
  for (const key of [
    '--brand-lx',
    '--brand-ly',
    '--brand-i',
    '--brand-angle',
    '--brand-glow',
    '--brand-ox',
    '--brand-oy',
  ]) {
    brand.style.removeProperty(key)
  }
}

function applyStatic(brand: HTMLElement) {
  applyVars(brand, {
    lx: 0.78,
    ly: 0.22,
    intensity: 0.7,
    angle: 128,
    glow: 0.48,
    ox: 3.2,
    oy: -2.4,
  })
  brand.classList.add('brand--lit')
}

export function createBrandLightRoom(
  video: HTMLVideoElement,
  brand: HTMLElement,
  options: { reduceMotion?: boolean } = {},
): BrandLightRoom {
  const reduceMotion =
    options.reduceMotion ??
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  brand.classList.add('brand--lit')

  if (reduceMotion) {
    applyStatic(brand)
    return {
      dispose: () => {
        brand.classList.remove('brand--lit')
        clearVars(brand)
      },
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE_W
  canvas.height = SAMPLE_H
  const ctx = canvas.getContext('2d', {
    alpha: false,
    willReadFrequently: true,
  })

  if (!ctx) {
    applyStatic(brand)
    return {
      dispose: () => {
        brand.classList.remove('brand--lit')
        clearVars(brand)
      },
    }
  }

  let raf = 0
  let disposed = false
  let lastTick = 0
  let failed = false
  let brandBox = readBrandBox(brand)
  let boxStale = false

  const smooth: Smooth = {
    lx: 0.78,
    ly: 0.22,
    intensity: 0.55,
    angle: 128,
    glow: 0.4,
    ox: 3,
    oy: -2,
  }

  applyVars(brand, smooth)

  const markBoxStale = () => {
    boxStale = true
  }

  const sample = () => {
    if (disposed || failed || document.hidden) return
    if (video.readyState < 2 || video.videoWidth < 2) return

    const vw = window.innerWidth
    const vh = window.innerHeight
    if (vw < 2 || vh < 2) return

    if (boxStale || brandBox.width < 2) {
      brandBox = readBrandBox(brand)
      boxStale = false
    }

    // Skip work while entrance opacity is 0 or brand is offscreen
    if (
      brandBox.bottom < 0 ||
      brandBox.top > vh ||
      brandBox.right < 0 ||
      brandBox.left > vw
    ) {
      return
    }

    const crop = coverCrop(video.videoWidth, video.videoHeight, vw / vh)
    try {
      ctx.drawImage(
        video,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        0,
        0,
        SAMPLE_W,
        SAMPLE_H,
      )
    } catch {
      failed = true
      applyStatic(brand)
      return
    }

    let data: ImageData
    try {
      data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H)
    } catch {
      failed = true
      applyStatic(brand)
      return
    }

    const px = data.data
    const { cx: brandCx, cy: brandCy, width: brandW, height: brandH } = brandBox

    let brightSum = 0
    let brightWx = 0
    let brightWy = 0
    let peak = 0
    let localSum = 0
    let localCount = 0
    let facingSum = 0
    let facingCount = 0

    const bx0 = clamp((brandBox.left / vw) * SAMPLE_W, 0, SAMPLE_W - 1)
    const by0 = clamp((brandBox.top / vh) * SAMPLE_H, 0, SAMPLE_H - 1)
    const bx1 = clamp((brandBox.right / vw) * SAMPLE_W, 0, SAMPLE_W)
    const by1 = clamp((brandBox.bottom / vh) * SAMPLE_H, 0, SAMPLE_H)

    for (let y = 0; y < SAMPLE_H; y++) {
      for (let x = 0; x < SAMPLE_W; x++) {
        const i = (y * SAMPLE_W + x) * 4
        const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
        if (l > peak) peak = l

        // Higher threshold → orb / plume dominate the centroid
        const weight = Math.max(0, l - 95) ** 1.85
        if (weight > 0) {
          brightSum += weight
          brightWx += x * weight
          brightWy += y * weight
        }

        if (x >= bx0 && x < bx1 && y >= by0 && y < by1) {
          localSum += l
          localCount++
        }
      }
    }

    const localMean = localCount ? localSum / localCount : 0

    let lightVX = 0.58
    let lightVY = 0.4
    if (brightSum > 1) {
      lightVX = brightWx / brightSum / SAMPLE_W
      lightVY = brightWy / brightSum / SAMPLE_H
    }

    const lightX = lightVX * vw
    const lightY = lightVY * vh

    // Sample a wedge of the frame between brand and light for “facing” fill
    const midX = clamp(
      (((brandCx + lightX) * 0.5) / vw) * SAMPLE_W,
      0,
      SAMPLE_W - 1,
    )
    const midY = clamp(
      (((brandCy + lightY) * 0.5) / vh) * SAMPLE_H,
      0,
      SAMPLE_H - 1,
    )
    const faceR = 6
    for (let y = Math.max(0, Math.floor(midY - faceR)); y < Math.min(SAMPLE_H, midY + faceR); y++) {
      for (let x = Math.max(0, Math.floor(midX - faceR)); x < Math.min(SAMPLE_W, midX + faceR); x++) {
        const i = (y * SAMPLE_W + x) * 4
        const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
        facingSum += l
        facingCount++
      }
    }
    const facingMean = facingCount ? facingSum / facingCount : peak

    // Specular rides toward the room light — full travel so direction reads
    const relX = (lightX - brandCx) / Math.max(brandW, 1)
    const relY = (lightY - brandCy) / Math.max(brandH, 1)
    const lx = clamp(0.5 + relX * 0.78, 0.06, 0.94)
    const ly = clamp(0.5 + relY * 0.78, 0.06, 0.94)

    const dx = (lightX - brandCx) / vw
    const dy = (lightY - brandCy) / vh
    const dist = Math.hypot(dx, dy)
    const proximity = clamp(1.2 - dist * 1.2, 0.3, 1)

    const intensity = clamp(
      (peak / 255) * 0.4 +
        (facingMean / 255) * 0.35 +
        (localMean / 255) * 0.15 +
        proximity * 0.25,
      0.32,
      1,
    )
    const glow = clamp(intensity * 0.75 * proximity, 0.18, 0.85)

    const angle =
      ((Math.atan2(lightY - brandCy, lightX - brandCx) * 180) / Math.PI + 360) %
      360

    // Directional bloom offset (px) — light on the right pulls glow right
    const ox = clamp((lx - 0.5) * 12, -7, 7)
    const oy = clamp((ly - 0.5) * 12, -7, 7)

    smooth.lx = lerp(smooth.lx, lx, SMOOTH)
    smooth.ly = lerp(smooth.ly, ly, SMOOTH)
    smooth.intensity = lerp(smooth.intensity, intensity, SMOOTH)
    smooth.glow = lerp(smooth.glow, glow, SMOOTH)
    smooth.angle = shortestAngleLerp(smooth.angle, angle, SMOOTH * 0.75)
    smooth.ox = lerp(smooth.ox, ox, SMOOTH)
    smooth.oy = lerp(smooth.oy, oy, SMOOTH)
    applyVars(brand, smooth)
  }

  const loop = (t: number) => {
    if (disposed) return
    if (t - lastTick >= TICK_MS) {
      lastTick = t
      sample()
    }
    raf = requestAnimationFrame(loop)
  }

  const onVisibility = () => {
    if (!document.hidden && !disposed && !failed) {
      boxStale = true
      sample()
    }
  }

  window.addEventListener('resize', markBoxStale, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  video.addEventListener('playing', sample)
  raf = requestAnimationFrame(loop)

  return {
    dispose: () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', markBoxStale)
      document.removeEventListener('visibilitychange', onVisibility)
      video.removeEventListener('playing', sample)
      brand.classList.remove('brand--lit')
      clearVars(brand)
    },
  }
}
