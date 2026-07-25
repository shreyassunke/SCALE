import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineSegments,
  LineBasicMaterial,
  MathUtils,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'

/** Match Volume3D room half-extent so stars land on the familiar box */
const BOX = 1.1

function makeCore(): CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.22, 'rgba(230,240,255,0.8)')
  g.addColorStop(0.55, 'rgba(140,175,230,0.25)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

/** Map particle index → a point on the 2.2 cube wireframe (12 edges) */
function boxEdgePoint(i: number, n: number, out: Float32Array, offset: number) {
  const edge = i % 12
  const t = ((i * 0.61803398875) % 1 + (i / n) * 0.37) % 1
  const u = (t * 2 - 1) * BOX
  // 12 edges of axis-aligned cube centered at origin
  switch (edge) {
    case 0:
      out[offset] = u
      out[offset + 1] = BOX
      out[offset + 2] = BOX
      break
    case 1:
      out[offset] = u
      out[offset + 1] = BOX
      out[offset + 2] = -BOX
      break
    case 2:
      out[offset] = u
      out[offset + 1] = -BOX
      out[offset + 2] = BOX
      break
    case 3:
      out[offset] = u
      out[offset + 1] = -BOX
      out[offset + 2] = -BOX
      break
    case 4:
      out[offset] = BOX
      out[offset + 1] = u
      out[offset + 2] = BOX
      break
    case 5:
      out[offset] = BOX
      out[offset + 1] = u
      out[offset + 2] = -BOX
      break
    case 6:
      out[offset] = -BOX
      out[offset + 1] = u
      out[offset + 2] = BOX
      break
    case 7:
      out[offset] = -BOX
      out[offset + 1] = u
      out[offset + 2] = -BOX
      break
    case 8:
      out[offset] = BOX
      out[offset + 1] = BOX
      out[offset + 2] = u
      break
    case 9:
      out[offset] = BOX
      out[offset + 1] = -BOX
      out[offset + 2] = u
      break
    case 10:
      out[offset] = -BOX
      out[offset + 1] = BOX
      out[offset + 2] = u
      break
    default:
      out[offset] = -BOX
      out[offset + 1] = -BOX
      out[offset + 2] = u
      break
  }
}

/**
 * 7D metaphor: space of all logically possible realities —
 * a frozen absolute map; nothing created, nothing destroyed.
 * Coda: stars collapse onto the familiar 3D room wireframe.
 */
export function createLogical7D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Logical7D'

  let mounted = false
  let lattice: Points | null = null
  let wire: LineSegments | null = null
  let core: Sprite | null = null
  let halo: Sprite | null = null
  let tex: CanvasTexture | null = null
  let basePositions: Float32Array | null = null
  let targetPositions: Float32Array | null = null

  const mount = () => {
    if (mounted) return
    tex = makeCore()

    const n = perf.tier === 'high' ? 960 : 420
    const positions = new Float32Array(n * 3)
    basePositions = new Float32Array(n * 3)
    targetPositions = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const layer = Math.floor(i / (n / 7))
      const r = 0.35 + layer * 0.48 + (i % 7) * 0.015
      const a = i * 2.399
      const y = ((i % 41) / 41 - 0.5) * 3.4
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      basePositions[i * 3] = x
      basePositions[i * 3 + 1] = y
      basePositions[i * 3 + 2] = z
      boxEdgePoint(i, n, targetPositions, i * 3)
    }

    lattice = new Points(
      new BufferGeometry().setAttribute('position', new BufferAttribute(positions, 3)),
      new PointsMaterial({
        color: new Color('#dce9ff'),
        size: 0.026,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    )

    const wireSegs: number[] = []
    const rings = perf.tier === 'high' ? 5 : 3
    const segs = 24
    for (let r = 0; r < rings; r++) {
      const radius = 0.7 + r * 0.55
      for (let s = 0; s < segs; s++) {
        const a0 = (s / segs) * Math.PI * 2
        const a1 = ((s + 1) / segs) * Math.PI * 2
        const y = (r / Math.max(1, rings - 1) - 0.5) * 2.2
        wireSegs.push(
          Math.cos(a0) * radius,
          y,
          Math.sin(a0) * radius,
          Math.cos(a1) * radius,
          y,
          Math.sin(a1) * radius,
        )
        if (s % 4 === 0 && r < rings - 1) {
          const r2 = 0.7 + (r + 1) * 0.55
          const y2 = ((r + 1) / Math.max(1, rings - 1) - 0.5) * 2.2
          wireSegs.push(
            Math.cos(a0) * radius,
            y,
            Math.sin(a0) * radius,
            Math.cos(a0) * r2,
            y2,
            Math.sin(a0) * r2,
          )
        }
      }
    }
    wire = new LineSegments(
      new BufferGeometry().setAttribute(
        'position',
        new BufferAttribute(new Float32Array(wireSegs), 3),
      ),
      new LineBasicMaterial({
        color: new Color('#a8c4e8'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )

    core = new Sprite(
      new SpriteMaterial({
        map: tex,
        color: new Color('#ffffff'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    core.scale.setScalar(1.6)

    halo = new Sprite(
      new SpriteMaterial({
        map: tex,
        color: new Color('#b8d4ff'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    halo.scale.setScalar(2.8)

    group.add(wire, lattice, halo, core)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !lattice || !wire || !core || !halo || !basePositions || !targetPositions)
      return

    const d = ctx.dimension
    let presence = 0
    let enter = 0
    // Wait for 7D enter-morph — do not collapse during late 6D commentary
    if (d < 6.62) presence = 0
    else if (d < 7) {
      enter = (d - 6.62) / 0.38
      presence = enter
    } else {
      presence = 1
      enter = 1
    }

    // Coda progress: 0 = still 7D, 1 = home in 3D
    // Timings aligned so solid room is up by the "Back to three" beat (~0.3)
    const codaT = ctx.section === 'coda' ? MathUtils.clamp(ctx.sectionProgress, 0, 1) : 0
    const collapse = ctx.section === 'coda' ? MathUtils.smoothstep(codaT, 0, 0.26) : 0
    const scaffoldFade =
      ctx.section === 'coda' ? 1 - MathUtils.smoothstep(codaT, 0, 0.12) : 1
    // Hand off to Volume3D — stars gone by the time copy peaks
    const starFade =
      ctx.section === 'coda' ? 1 - MathUtils.smoothstep(codaT, 0.18, 0.38) : 1

    if (ctx.section === 'coda') {
      presence = starFade
      enter = 1
    }

    const p = presence * presence * (3 - 2 * presence)

    const fold = 1 - Math.pow(1 - MathUtils.clamp(enter, 0, 1), 2)
    const freeze = ctx.section === 'coda' ? 1 : MathUtils.clamp((enter - 0.65) / 0.35, 0, 1)
    const motion = (1 - freeze) * p * scaffoldFade

    // Ease collapse — ease-in-out so stars rush then settle on edges
    const c = collapse * collapse * (3 - 2 * collapse)

    const posAttr = lattice.geometry.getAttribute('position') as BufferAttribute
    const arr = posAttr.array as Float32Array
    const n = basePositions.length / 3
    for (let i = 0; i < n; i++) {
      const bx = basePositions[i * 3]
      const by = basePositions[i * 3 + 1]
      const bz = basePositions[i * 3 + 2]
      const tx = targetPositions[i * 3]
      const ty = targetPositions[i * 3 + 1]
      const tz = targetPositions[i * 3 + 2]

      if (ctx.section === 'coda') {
        // Light stagger — keep short so the box silhouette completes before copy
        const delay = (i % 11) / 90
        const local = MathUtils.clamp((c - delay) / Math.max(0.001, 1 - delay), 0, 1)
        const e = local * local * (3 - 2 * local)
        arr[i * 3] = bx + (tx - bx) * e
        arr[i * 3 + 1] = by + (ty - by) * e
        arr[i * 3 + 2] = bz + (tz - bz) * e
      } else {
        const pull = 1 - (1 - fold) * 0.45
        const swirl = motion * 0.15 * Math.sin(ctx.time * 0.9 + i * 0.02)
        arr[i * 3] = bx * pull * Math.cos(swirl) - bz * pull * Math.sin(swirl)
        arr[i * 3 + 1] = by * pull
        arr[i * 3 + 2] = bx * pull * Math.sin(swirl) + bz * pull * Math.cos(swirl)
      }
    }
    posAttr.needsUpdate = true

    const starOp = ctx.section === 'coda' ? starFade * (0.55 + c * 0.35) : p * 0.6
    ;(lattice.material as PointsMaterial).opacity = starOp
    ;(lattice.material as PointsMaterial).size = ctx.section === 'coda' ? 0.03 - c * 0.008 : 0.022 + (1 - freeze) * 0.012

    ;(wire.material as LineBasicMaterial).opacity =
      p * scaffoldFade * (0.2 + (1 - freeze) * 0.25)

    const pulse = 0.85 + Math.sin(ctx.time * (1.2 + motion * 2)) * (0.08 + motion * 0.12)
    core.material.opacity = p * scaffoldFade * 0.5 * pulse
    halo.material.opacity = p * scaffoldFade * 0.22 * pulse
    core.scale.setScalar((1.4 + pulse * 0.35) * scaffoldFade)
    halo.scale.setScalar((2.4 + pulse * 0.5) * scaffoldFade)

    if (ctx.section === 'coda') {
      // Settle toward the same orientation as the 3D room
      const settleY = MathUtils.lerp(ctx.time * 0.02, Math.sin(ctx.time * 0.15) * 0.25, c)
      const settleX = MathUtils.lerp(0, 0.12, c)
      group.rotation.y = settleY
      group.rotation.x = settleX
      group.scale.setScalar(1)
    } else {
      group.rotation.y = ctx.time * (0.015 + motion * 0.08) * p
      group.rotation.x = Math.sin(ctx.time * 0.2) * 0.06 * motion
      group.scale.setScalar(Math.max(0, p) * (0.85 + fold * 0.15))
    }
  }

  const dispose = () => {
    if (!mounted) return
    group.clear()
    lattice?.geometry.dispose()
    ;(lattice?.material as PointsMaterial | undefined)?.dispose()
    wire?.geometry.dispose()
    ;(wire?.material as LineBasicMaterial | undefined)?.dispose()
    core?.material.dispose()
    halo?.material.dispose()
    tex?.dispose()
    lattice = null
    wire = null
    core = null
    halo = null
    tex = null
    basePositions = null
    targetPositions = null
    mounted = false
  }

  return {
    name: 'Logical7D',
    group,
    mount,
    update,
    dispose,
    get mounted() {
      return mounted
    },
  }
}
