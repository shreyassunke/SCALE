import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  MathUtils,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'

function makeGlow(): CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(180,220,255,0.65)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

function wormPoint(t: number, out: { x: number; y: number; z: number }) {
  out.x = -2.8 + t * 5.6
  out.y = Math.sin(t * Math.PI * 2.2) * 0.35
  out.z = Math.cos(t * Math.PI * 1.4) * 0.25
}

/**
 * 4D as Minkowski spacetime: a "timeline strip" + life as a frozen worm of selves.
 * (Geometric tesseract is intentionally secondary — physics' 4th is time.)
 */
export function createSpacetime4D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Spacetime4D'

  let mounted = false
  let timeline: Line | null = null
  let worm: Points | null = null
  let shell: Group | null = null
  let frames: Group | null = null
  let nowMarker: Sprite | null = null
  let nowHalo: Sprite | null = null
  let tex: CanvasTexture | null = null
  const _p = { x: 0, y: 0, z: 0 }

  const mount = () => {
    if (mounted) return
    tex = makeGlow()

    // Horizontal "video editing" timeline with tick marks
    const ticks: number[] = [-3.2, 0, 0]
    for (let i = 0; i <= 12; i++) {
      const x = -3.2 + (i / 12) * 6.4
      const h = i % 3 === 0 ? 0.12 : 0.06
      ticks.push(x, -h, 0, x, h, 0)
    }
    ticks.push(3.2, 0, 0)
    const tGeo = new BufferGeometry()
    tGeo.setAttribute('position', new BufferAttribute(new Float32Array(ticks), 3))
    timeline = new Line(
      tGeo,
      new LineBasicMaterial({
        color: new Color('#a8d4ff'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )

    // Spacetime worm — denser bead chain with past→future color falloff
    const n = Math.max(80, Math.floor(perf.particleCount * 1.4))
    const pos = new Float32Array(n * 3)
    const cols = new Float32Array(n * 3)
    const past = new Color('#6a9cc8')
    const present = new Color('#e8f4ff')
    const future = new Color('#7ec8ff')
    const tmp = new Color()

    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      wormPoint(t, _p)
      // Radial thickness — thicker mid-life, taper at birth/death
      const radius = 0.04 + Math.sin(t * Math.PI) * 0.1
      const a = (i * 2.399) % (Math.PI * 2)
      pos[i * 3] = _p.x + Math.cos(a) * radius * 0.35
      pos[i * 3 + 1] = _p.y + Math.sin(a) * radius
      pos[i * 3 + 2] = _p.z + Math.cos(a * 1.3) * radius * 0.6

      if (t < 0.55) tmp.copy(past).lerp(present, t / 0.55)
      else tmp.copy(present).lerp(future, (t - 0.55) / 0.45)
      cols[i * 3] = tmp.r
      cols[i * 3 + 1] = tmp.g
      cols[i * 3 + 2] = tmp.b
    }

    const wormGeo = new BufferGeometry()
    wormGeo.setAttribute('position', new BufferAttribute(pos, 3))
    wormGeo.setAttribute('color', new BufferAttribute(cols, 3))
    worm = new Points(
      wormGeo,
      new PointsMaterial({
        size: 0.065,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        vertexColors: true,
      }),
    )

    // Wireframe tube shells along the worm path (clarity of the 4D volume)
    shell = new Group()
    const ringCount = perf.tier === 'high' ? 14 : 9
    const segs = 16
    for (let r = 0; r < ringCount; r++) {
      const t = r / (ringCount - 1)
      wormPoint(t, _p)
      const rad = 0.12 + Math.sin(t * Math.PI) * 0.22
      const ringPos = new Float32Array(segs * 3)
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2
        ringPos[s * 3] = _p.x
        ringPos[s * 3 + 1] = _p.y + Math.sin(a) * rad
        ringPos[s * 3 + 2] = _p.z + Math.cos(a) * rad
      }
      const loop = new LineLoop(
        new BufferGeometry().setAttribute('position', new BufferAttribute(ringPos, 3)),
        new LineBasicMaterial({
          color: new Color('#5ec4d4'),
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      )
      loop.userData.t = t
      shell.add(loop)
    }

    // Discrete life-stage markers (birth → now → death)
    frames = new Group()
    const stages = [
      { t: 0.06, scale: 0.16, color: '#9fd0ff' },
      { t: 0.28, scale: 0.14, color: '#b8dcff' },
      { t: 0.55, scale: 0.12, color: '#e8f4ff' },
      { t: 0.78, scale: 0.14, color: '#a8d4ff' },
      { t: 0.96, scale: 0.16, color: '#7eb8e8' },
    ]
    for (const stage of stages) {
      const s = new Sprite(
        new SpriteMaterial({
          map: tex,
          color: new Color(stage.color),
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      )
      wormPoint(stage.t, _p)
      s.position.set(_p.x, _p.y, _p.z)
      s.scale.setScalar(stage.scale)
      s.userData.t = stage.t
      frames.add(s)
    }

    nowHalo = new Sprite(
      new SpriteMaterial({
        map: tex,
        color: new Color('#ffe6a8'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    nowHalo.scale.setScalar(0.55)

    nowMarker = new Sprite(
      new SpriteMaterial({
        map: tex,
        color: new Color('#fff4d0'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    nowMarker.scale.setScalar(0.28)

    group.add(timeline, worm, shell, frames, nowHalo, nowMarker)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !timeline || !worm || !shell || !frames || !nowMarker || !nowHalo) return

    const d = ctx.dimension
    let presence = 0
    // Wait for 4D enter-morph — do not appear during late 3D commentary
    if (d < 3.62) presence = 0
    else if (d < 4) presence = (d - 3.62) / 0.38
    else if (d < 4.7) presence = 1
    else if (d < 5.25) presence = 1 - (d - 4.7) / 0.55
    else presence = 0

    // Smoothstep for cleaner fades
    const p = presence * presence * (3 - 2 * presence)

    ;(timeline.material as LineBasicMaterial).opacity = p * 0.5
    ;(worm.material as PointsMaterial).opacity = p * 0.9
    ;(worm.material as PointsMaterial).size = 0.055 + p * 0.02

    for (const child of shell.children) {
      const loop = child as LineLoop
      const t = loop.userData.t as number
      // Mid-life rings brighter; ends softer
      const mid = Math.sin(t * Math.PI)
      ;(loop.material as LineBasicMaterial).opacity = p * (0.12 + mid * 0.35)
    }

    // Scroll-scrubbed "NOW" — progresses along the worm as you enter 4D
    const nowT = MathUtils.clamp(0.2 + ctx.sectionProgress * 0.55, 0.08, 0.92)
    wormPoint(nowT, _p)
    nowMarker.position.set(_p.x, _p.y, _p.z)
    nowHalo.position.set(_p.x, _p.y, _p.z)
    const pulse = 0.85 + Math.sin(ctx.time * 2.4) * 0.15
    nowMarker.material.opacity = p * 0.95 * pulse
    nowHalo.material.opacity = p * 0.35 * pulse
    nowMarker.scale.setScalar(0.24 + pulse * 0.06)
    nowHalo.scale.setScalar(0.48 + pulse * 0.12)

    for (const child of frames.children) {
      const sprite = child as Sprite
      const t = sprite.userData.t as number
      const dist = Math.abs(t - nowT)
      // Past/future stages dim relative to the scrubbed now
      const falloff = MathUtils.clamp(1 - dist * 1.6, 0.25, 1)
      sprite.material.opacity = p * 0.55 * falloff
      const base = t === 0.55 ? 0.14 : 0.12
      sprite.scale.setScalar(base + (1 - dist) * 0.06)
    }

    // Mild side drift — editor's eye sliding along the strip
    group.rotation.y = p * Math.sin(ctx.time * 0.12) * 0.18
    group.rotation.x = p * 0.14
    group.position.x = p * Math.sin(ctx.time * 0.09 + nowT) * 0.12
    group.position.y = p * Math.cos(ctx.time * 0.07) * 0.05
  }

  const dispose = () => {
    if (!mounted) return
    group.clear()
    timeline?.geometry.dispose()
    ;(timeline?.material as LineBasicMaterial | undefined)?.dispose()
    worm?.geometry.dispose()
    ;(worm?.material as PointsMaterial | undefined)?.dispose()
    if (shell) {
      for (const child of shell.children) {
        const loop = child as LineLoop
        loop.geometry.dispose()
        ;(loop.material as LineBasicMaterial).dispose()
      }
    }
    if (frames) {
      for (const child of frames.children) {
        ;(child as Sprite).material.dispose()
      }
    }
    nowMarker?.material.dispose()
    nowHalo?.material.dispose()
    tex?.dispose()
    timeline = null
    worm = null
    shell = null
    frames = null
    nowMarker = null
    nowHalo = null
    tex = null
    mounted = false
  }

  return {
    name: 'Spacetime4D',
    group,
    mount,
    update,
    dispose,
    get mounted() {
      return mounted
    },
  }
}
