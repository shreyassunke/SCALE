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

type Branch = { x: number; y: number; z: number; depth: number; side: number }

function makeGlow(): CanvasTexture {
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(180,220,255,0.5)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

/**
 * 5D metaphor: Everett-style branching — one temporal worm becomes a fractal tree of outcomes.
 */
export function createBranching5D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Branching5D'

  let mounted = false
  let lines: LineSegments | null = null
  let tips: Points | null = null
  let forkMarker: Sprite | null = null
  let tex: CanvasTexture | null = null
  let maxDepth = 4
  let segCount = 0
  let tipCount = 0
  /** Per-segment depth for progressive reveal (one value per endpoint pair → use start depth) */
  let segDepths: number[] = []

  const mount = () => {
    if (mounted) return
    tex = makeGlow()

    maxDepth = perf.tier === 'high' ? 6 : 4
    const branches: Branch[] = [{ x: 0, y: -2.2, z: 0, depth: 0, side: 0 }]
    const segs: number[] = []
    const segCols: number[] = []
    const tipPos: number[] = []
    const tipCols: number[] = []
    segDepths = []

    const original = new Color('#7ec8ff')
    const divergent = new Color('#ff8a9a')
    const trunk = new Color('#9fd0ff')
    const tmp = new Color()

    const grow = (b: Branch) => {
      if (b.depth >= maxDepth) {
        tipPos.push(b.x, b.y, b.z)
        tmp.copy(original).lerp(divergent, Math.abs(b.side))
        tipCols.push(tmp.r, tmp.g, tmp.b)
        return
      }
      const splits = 2
      for (let i = 0; i < splits; i++) {
        const spread = 0.5 + b.depth * 0.14
        const angle = (i / splits) * Math.PI - Math.PI / 2 + (i - 0.5) * 0.75
        const len = 0.88 - b.depth * 0.09
        const nx = b.x + Math.sin(angle) * spread * len
        const ny = b.y + len * 0.95
        const nz = b.z + Math.cos(angle * 1.3) * spread * 0.55 * len
        const side = b.depth === 0 ? (i === 0 ? -1 : 1) : b.side

        segs.push(b.x, b.y, b.z, nx, ny, nz)
        segDepths.push(b.depth)

        // Trunk cyan → tips pink (divergent destinies)
        const mix = b.depth / maxDepth
        tmp.copy(trunk).lerp(side < 0 ? original : divergent, mix * 0.85)
        segCols.push(tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b)

        grow({ x: nx, y: ny, z: nz, depth: b.depth + 1, side })
      }
    }
    grow(branches[0])
    segCount = segDepths.length
    tipCount = tipPos.length / 3

    const lineGeo = new BufferGeometry()
    lineGeo.setAttribute('position', new BufferAttribute(new Float32Array(segs), 3))
    lineGeo.setAttribute('color', new BufferAttribute(new Float32Array(segCols), 3))
    lines = new LineSegments(
      lineGeo,
      new LineBasicMaterial({
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      }),
    )

    const tipGeo = new BufferGeometry()
    tipGeo.setAttribute('position', new BufferAttribute(new Float32Array(tipPos), 3))
    tipGeo.setAttribute('color', new BufferAttribute(new Float32Array(tipCols), 3))
    tips = new Points(
      tipGeo,
      new PointsMaterial({
        size: 0.055,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        vertexColors: true,
      }),
    )

    // First major fork pulse marker
    forkMarker = new Sprite(
      new SpriteMaterial({
        map: tex,
        color: new Color('#cfe8ff'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    forkMarker.position.set(0, -1.35, 0)
    forkMarker.scale.setScalar(0.35)

    group.add(lines, tips, forkMarker)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !lines || !tips || !forkMarker) return

    const d = ctx.dimension
    let presence = 0
    let grow = 0
    // Wait for 5D enter-morph — do not branch during late 4D commentary
    if (d < 4.62) presence = 0
    else if (d < 5) {
      grow = (d - 4.62) / 0.38
      presence = grow
    } else if (d < 5.7) {
      presence = 1
      grow = 1
    } else if (d < 6.25) {
      presence = 1 - (d - 5.7) / 0.55
      grow = 1
    }

    const p = presence * presence * (3 - 2 * presence)

    // Progressive depth reveal: trunk first, then canopy
    const revealDepth = grow * maxDepth
    let visibleSegs = 0
    for (let i = 0; i < segCount; i++) {
      if (segDepths[i] <= revealDepth) visibleSegs++
    }
    lines.geometry.setDrawRange(0, Math.max(0, visibleSegs * 2))

    // Tips appear after most branches are out
    const tipReveal = MathUtils.clamp((grow - 0.45) / 0.55, 0, 1)
    tips.geometry.setDrawRange(0, Math.floor(tipCount * tipReveal))

    group.scale.setScalar(0.2 + grow * 0.8)
    ;(lines.material as LineBasicMaterial).opacity = p * 0.75
    ;(tips.material as PointsMaterial).opacity = p * tipReveal * 0.9
    ;(tips.material as PointsMaterial).size = 0.05 + Math.sin(ctx.time * 1.8) * 0.008

    // Pulse on the major choice fork
    const forkPulse = 0.7 + Math.sin(ctx.time * 3.2) * 0.3
    forkMarker.material.opacity = p * Math.min(1, grow * 2.2) * 0.55 * forkPulse
    forkMarker.scale.setScalar(0.28 + forkPulse * 0.12)

    group.rotation.y = ctx.time * 0.07 * p
    group.rotation.z = Math.sin(ctx.time * 0.15) * 0.04 * p
  }

  const dispose = () => {
    if (!mounted) return
    group.clear()
    lines?.geometry.dispose()
    ;(lines?.material as LineBasicMaterial | undefined)?.dispose()
    tips?.geometry.dispose()
    ;(tips?.material as PointsMaterial | undefined)?.dispose()
    forkMarker?.material.dispose()
    tex?.dispose()
    lines = null
    tips = null
    forkMarker = null
    tex = null
    segDepths = []
    mounted = false
  }

  return {
    name: 'Branching5D',
    group,
    mount,
    update,
    dispose,
    get mounted() {
      return mounted
    },
  }
}
