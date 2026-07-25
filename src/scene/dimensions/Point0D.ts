import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'

function makeGlowTexture(): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.2, 'rgba(200,230,255,0.85)')
  g.addColorStop(0.55, 'rgba(120,180,255,0.25)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export function createPoint0D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Point0D'

  let mounted = false
  let glow: Sprite | null = null
  let core: Sprite | null = null
  let dust: Points | null = null
  let glowTex: CanvasTexture | null = null

  const mount = () => {
    if (mounted) return

    glowTex = makeGlowTexture()

    const glowMat = new SpriteMaterial({
      map: glowTex,
      color: new Color('#cfe8ff'),
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    glow = new Sprite(glowMat)
    glow.scale.setScalar(0.55)

    const coreMat = new SpriteMaterial({
      map: glowTex,
      color: new Color('#ffffff'),
      transparent: true,
      opacity: 1,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    core = new Sprite(coreMat)
    core.scale.setScalar(0.08)

    // Still ambient dust — positions fixed, no motion
    const count = perf.dustCount
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 10
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6
      positions[i * 3 + 2] = r * Math.cos(phi) - 2
    }
    const dustGeo = new BufferGeometry()
    dustGeo.setAttribute('position', new BufferAttribute(positions, 3))
    const dustMat = new PointsMaterial({
      color: new Color('#6a8aaa'),
      size: 0.025,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    })
    dust = new Points(dustGeo, dustMat)

    group.add(dust, glow, core)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !glow || !core || !dust) return

    const d = ctx.dimension

    // Hold full point through 0D; only smear/fade once 1D enter-morph begins
    const pointPresence = d < 0.2 ? 1 : d < 1 ? 1 - (d - 0.2) / 0.8 : 0
    const stretch = d < 0.25 ? 0 : d < 1 ? Math.max(0, (d - 0.25) / 0.75) : 1

    // Stretch the glow into a horizontal smear as we leave 0D
    const base = 0.55 + stretch * 2.2
    glow.scale.set(base * (1 + stretch * 4), 0.55 * (1 - stretch * 0.7), 1)
    glow.material.opacity = 0.15 + pointPresence * 0.75
    core.material.opacity = pointPresence
    core.scale.setScalar(0.08 * (1 - stretch * 0.5))

    const dustMat = dust.material as PointsMaterial
    dustMat.opacity = 0.12 + pointPresence * 0.28

    // Soft pulse only while still a point
    if (d < 0.35 && perf.enableSoftGlow) {
      const pulse = 1 + Math.sin(ctx.time * 1.2) * 0.04
      core.scale.setScalar(0.08 * pulse)
    }
  }

  const dispose = () => {
    if (!mounted) return
    group.clear()
    glow?.material.dispose()
    core?.material.dispose()
    dust?.geometry.dispose()
    ;(dust?.material as PointsMaterial | undefined)?.dispose()
    glowTex?.dispose()
    glow = null
    core = null
    dust = null
    glowTex = null
    mounted = false
  }

  return {
    name: 'Point0D',
    group,
    mount,
    update,
    dispose,
    get mounted() {
      return mounted
    },
  }
}
