import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineLoop,
  LineBasicMaterial,
  MathUtils,
  Points,
  PointsMaterial,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'

/**
 * 6D metaphor: landscape of universes with different physical constants.
 * Contour shells + drifting field — a tunnel of alternate law-sets.
 */
export function createLandscape6D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Landscape6D'

  let mounted = false
  let field: Points | null = null
  let shells: Group | null = null
  let basePositions: Float32Array | null = null

  const mount = () => {
    if (mounted) return

    const n = perf.tier === 'high' ? 560 : 240
    const positions = new Float32Array(n * 3)
    const colors = new Float32Array(n * 3)
    basePositions = new Float32Array(n * 3)
    const near = new Color('#7ec8ff')
    const mid = new Color('#c8a0ff')
    const far = new Color('#ff8a6a')
    const tmp = new Color()

    for (let i = 0; i < n; i++) {
      // Layered shells — denser mid-field, sparser distance
      const layer = i / n
      const theta = i * 2.399
      const phi = Math.acos(MathUtils.clamp(1 - 2 * ((i * 0.618) % 1), -1, 1))
      // Prefer mid radii for clarity
      const rBias = 0.35 + Math.pow(Math.sin(layer * Math.PI), 1.4) * 0.65
      const r = 1.0 + rBias * 2.6
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.7
      const z = r * Math.cos(phi) * 0.85 - 0.4

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      basePositions[i * 3] = x
      basePositions[i * 3 + 1] = y
      basePositions[i * 3 + 2] = z

      // Depth-based color: cyan near → coral far
      const depth = MathUtils.clamp((r - 1) / 2.6, 0, 1)
      if (depth < 0.5) tmp.copy(near).lerp(mid, depth * 2)
      else tmp.copy(mid).lerp(far, (depth - 0.5) * 2)
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.setAttribute('color', new BufferAttribute(colors, 3))

    field = new Points(
      geo,
      new PointsMaterial({
        size: 0.042,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        vertexColors: true,
      }),
    )

    // Contour tunnel rings — nested law-landscape shells
    shells = new Group()
    const ringCount = perf.tier === 'high' ? 10 : 6
    const segs = perf.tier === 'high' ? 48 : 32
    for (let r = 0; r < ringCount; r++) {
      const t = r / (ringCount - 1)
      const radius = 0.9 + t * 2.4
      const z = -1.8 + t * 3.6
      const ringPos = new Float32Array(segs * 3)
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2
        // Soft contour wobble
        const wobble = 1 + Math.sin(a * 3 + t * 4) * 0.06
        ringPos[s * 3] = Math.cos(a) * radius * wobble
        ringPos[s * 3 + 1] = Math.sin(a) * radius * 0.72 * wobble
        ringPos[s * 3 + 2] = z
      }
      const col = new Color().copy(near).lerp(far, t)
      const loop = new LineLoop(
        new BufferGeometry().setAttribute('position', new BufferAttribute(ringPos, 3)),
        new LineBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      )
      loop.userData.t = t
      shells.add(loop)
    }

    group.add(field, shells)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !field || !shells || !basePositions) return

    const d = ctx.dimension
    let presence = 0
    // Wait for 6D enter-morph — do not open the tunnel during late 5D commentary
    if (d < 5.62) presence = 0
    else if (d < 6) presence = (d - 5.62) / 0.38
    else if (d < 6.7) presence = 1
    else if (d < 7.25) presence = 1 - (d - 6.7) / 0.55
    else presence = 0

    // Coda: dump the tunnel immediately so the 3D room can read cleanly
    if (ctx.section === 'coda') {
      presence *= Math.max(0, 1 - ctx.sectionProgress / 0.22)
    }

    const p = presence * presence * (3 - 2 * presence)

    ;(field.material as PointsMaterial).opacity = p * 0.85
    ;(field.material as PointsMaterial).size = 0.038 + p * 0.012

    // Forward drift through the landscape tunnel
    const drift = ctx.time * 0.35
    const posAttr = field.geometry.getAttribute('position') as BufferAttribute
    const arr = posAttr.array as Float32Array
    const n = basePositions.length / 3
    for (let i = 0; i < n; i++) {
      const bx = basePositions[i * 3]
      const by = basePositions[i * 3 + 1]
      const bz = basePositions[i * 3 + 2]
      const breathe = 1 + Math.sin(ctx.time * 0.8 + i * 0.05) * 0.03 * p
      arr[i * 3] = bx * breathe
      arr[i * 3 + 1] = by * breathe
      // Scroll Z — tunnel sensation
      let z = bz + ((drift + i * 0.01) % 3.2) - 1.6
      arr[i * 3 + 2] = z
    }
    posAttr.needsUpdate = true

    for (const child of shells.children) {
      const loop = child as LineLoop
      const t = loop.userData.t as number
      const midBoost = 1 - Math.abs(t - 0.45) * 1.2
      ;(loop.material as LineBasicMaterial).opacity = p * Math.max(0.08, 0.15 + midBoost * 0.35)
      // Rings drift toward camera
      loop.position.z = ((ctx.time * 0.25 + t * 2) % 2.8) - 1.4
      loop.rotation.z = ctx.time * 0.05 * (t > 0.5 ? 1 : -1)
    }

    group.rotation.y = ctx.time * 0.04 * p
    group.rotation.x = Math.sin(ctx.time * 0.11) * 0.1 * p
    group.scale.setScalar(0.75 + p * 0.35)
  }

  const dispose = () => {
    if (!mounted) return
    group.clear()
    field?.geometry.dispose()
    ;(field?.material as PointsMaterial | undefined)?.dispose()
    if (shells) {
      for (const child of shells.children) {
        const loop = child as LineLoop
        loop.geometry.dispose()
        ;(loop.material as LineBasicMaterial).dispose()
      }
    }
    field = null
    shells = null
    basePositions = null
    mounted = false
  }

  return {
    name: 'Landscape6D',
    group,
    mount,
    update,
    dispose,
    get mounted() {
      return mounted
    },
  }
}
