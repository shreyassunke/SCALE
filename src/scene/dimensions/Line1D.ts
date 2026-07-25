import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  Vector3,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'

function makeDotTexture(): CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(180,220,255,0.7)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const LINE_HALF = 2.2
/** Obstacle sits ahead on the +x side — traveler cannot bypass it */
const OBSTACLE_X = 0.85

export function createLine1D(): DimensionModule {
  const group = new Group()
  group.name = 'Line1D'

  let mounted = false
  let line: Line | null = null
  let traveler: Sprite | null = null
  let obstacle: Sprite | null = null
  let endA: Sprite | null = null
  let endB: Sprite | null = null
  let tex: CanvasTexture | null = null

  const mount = () => {
    if (mounted) return
    tex = makeDotTexture()

    const positions = new Float32Array([-LINE_HALF, 0, 0, LINE_HALF, 0, 0])
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    line = new Line(
      geo,
      new LineBasicMaterial({
        color: new Color('#d7ecff'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )

    const spriteMat = (color: string) =>
      new SpriteMaterial({
        map: tex!,
        color: new Color(color),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      })

    traveler = new Sprite(spriteMat('#ffffff'))
    traveler.scale.setScalar(0.12)
    endA = new Sprite(spriteMat('#ffffff'))
    endA.scale.setScalar(0.07)
    endB = new Sprite(spriteMat('#ffffff'))
    endB.scale.setScalar(0.07)

    // Blocker on the axis — "any obstacle is the end of the universe"
    obstacle = new Sprite(spriteMat('#ffb4a8'))
    obstacle.scale.setScalar(0.16)
    obstacle.position.set(OBSTACLE_X, 0, 0)

    group.add(line, endA, endB, obstacle, traveler)
    mounted = true
  }

  const tmp = new Vector3()

  const update = (ctx: DimensionContext) => {
    if (!mounted || !line || !traveler || !endA || !endB || !obstacle) return

    const d = ctx.dimension
    const sp = ctx.sectionProgress
    const onLine = ctx.section === '1'

    let opacity = 0
    let lengthScale = 0

    // Form only once 1D section enter-morph begins (d crosses ~0.25)
    if (d < 0.25) {
      opacity = 0
      lengthScale = 0
    } else if (d < 1) {
      const t = (d - 0.25) / 0.75
      opacity = t
      lengthScale = t
    } else if (d < 1.7) {
      opacity = 1
      lengthScale = 1
    } else if (d < 2.2) {
      const t = (d - 1.7) / 0.5
      opacity = 1 - t * 0.9
      lengthScale = 1
    } else {
      opacity = 0.05
      lengthScale = 1
    }

    const half = LINE_HALF * lengthScale
    const pos = line.geometry.attributes.position as BufferAttribute
    pos.setXYZ(0, -half, 0, 0)
    pos.setXYZ(1, half, 0, 0)
    pos.needsUpdate = true

    ;(line.material as LineBasicMaterial).opacity = opacity
    endA.position.set(-half, 0, 0)
    endB.position.set(half, 0, 0)
    endA.material.opacity = opacity * 0.9
    endB.material.opacity = opacity * 0.9

    // Obstacle lands with the late 1D copy beat (~0.8), not mid-0D
    const showObstacle = onLine ? sp >= 0.62 && sp < 0.98 : d >= 1.35 && d < 1.85
    obstacle.position.set(OBSTACLE_X * lengthScale, 0, 0)
    obstacle.material.opacity = showObstacle ? opacity * 0.95 : 0

    // Traveler oscillates but cannot pass the obstacle
    let travelX = -half
    const travelerLive = onLine ? sp >= 0.28 : d >= 0.85
    if (travelerLive && d < 2) {
      const phase = onLine ? Math.min(1, (sp - 0.28) / 0.35) : d < 1.15 ? (d - 0.85) / 0.3 : 1
      const raw = -half + (Math.sin(ctx.time * 0.85) * 0.5 + 0.5) * half * 2 * phase
      const maxX = showObstacle ? OBSTACLE_X * lengthScale - 0.12 : half
      travelX = Math.min(raw, maxX)
    }

    traveler.position.copy(tmp.set(travelX, 0, 0))
    traveler.material.opacity = opacity * (travelerLive ? 1 : 0.25)
  }

  const dispose = () => {
    if (!mounted) return
    group.clear()
    line?.geometry.dispose()
    ;(line?.material as LineBasicMaterial | undefined)?.dispose()
    traveler?.material.dispose()
    obstacle?.material.dispose()
    endA?.material.dispose()
    endB?.material.dispose()
    tex?.dispose()
    line = null
    traveler = null
    obstacle = null
    endA = null
    endB = null
    tex = null
    mounted = false
  }

  return {
    name: 'Line1D',
    group,
    mount,
    update,
    dispose,
    get mounted() {
      return mounted
    },
  }
}
