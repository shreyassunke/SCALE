import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  GridHelper,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'

function makeCreatureTexture(): CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.beginPath()
  ctx.moveTo(size * 0.5, size * 0.18)
  ctx.lineTo(size * 0.82, size * 0.78)
  ctx.lineTo(size * 0.18, size * 0.78)
  ctx.closePath()
  ctx.fillStyle = 'rgba(220,240,255,0.95)'
  ctx.fill()
  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function makeGlowTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const cx = c.getContext('2d')!
  const g = cx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(160,210,255,0.5)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  cx.fillStyle = g
  cx.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

export function createPlane2D(): DimensionModule {
  const group = new Group()
  group.name = 'Plane2D'

  let mounted = false
  let plane: Mesh | null = null
  let grid: GridHelper | null = null
  let creature: Sprite | null = null
  let circle: LineLoop | null = null
  let circleAsLine: Line | null = null
  let house: Line | null = null
  let finger: Sprite | null = null
  let creatureTex: CanvasTexture | null = null
  let glowTex: CanvasTexture | null = null

  const mount = () => {
    if (mounted) return

    plane = new Mesh(
      new PlaneGeometry(4.4, 4.4, 1, 1),
      new MeshBasicMaterial({
        color: new Color('#1a3048'),
        transparent: true,
        opacity: 0,
        side: DoubleSide,
        depthWrite: false,
      }),
    )
    plane.rotation.x = -Math.PI / 2

    grid = new GridHelper(4.4, 12, 0x6a9cc8, 0x2a4058)
    const gridMat = grid.material
    if (Array.isArray(gridMat)) {
      for (const m of gridMat) {
        m.transparent = true
        m.opacity = 0
        m.depthWrite = false
      }
    } else {
      gridMat.transparent = true
      gridMat.opacity = 0
      gridMat.depthWrite = false
    }

    // Circle on the plane — from the edge it collapses to a line segment
    const segs = 48
    const circlePos = new Float32Array((segs + 1) * 3)
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2
      circlePos[i * 3] = Math.cos(a) * 0.55 + 1.1
      circlePos[i * 3 + 1] = 0.02
      circlePos[i * 3 + 2] = Math.sin(a) * 0.55 - 0.2
    }
    const circleGeo = new BufferGeometry()
    circleGeo.setAttribute('position', new BufferAttribute(circlePos, 3))
    circle = new LineLoop(
      circleGeo,
      new LineBasicMaterial({
        color: new Color('#b8dcff'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )

    // Edge-on "what a flat creature sees"
    const lineGeo = new BufferGeometry()
    lineGeo.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([0.55, 0.03, -0.2, 1.65, 0.03, -0.2]), 3),
    )
    circleAsLine = new Line(
      lineGeo,
      new LineBasicMaterial({
        color: new Color('#ffe6a8'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )

    // Square house walls — fortress to neighbors, open box from above
    const h = 0.9
    const houseGeo = new BufferGeometry()
    houseGeo.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          -h, 0.02, -h, h, 0.02, -h, h, 0.02, -h, h, 0.02, h, h, 0.02, h, -h, 0.02, h, -h, 0.02, h,
          -h, 0.02, -h,
        ]),
        3,
      ),
    )
    house = new Line(
      houseGeo,
      new LineBasicMaterial({
        color: new Color('#9ec8ef'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    house.position.set(-0.9, 0, 0.7)

    creatureTex = makeCreatureTexture()
    glowTex = makeGlowTexture()
    creature = new Sprite(
      new SpriteMaterial({
        map: creatureTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    creature.scale.set(0.22, 0.22, 1)

    // "Finger from the third dimension" — touches without breaking walls
    finger = new Sprite(
      new SpriteMaterial({
        map: glowTex,
        color: new Color('#ffd7a0'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    finger.scale.setScalar(0.2)

    group.add(plane, grid, circle, circleAsLine, house, creature, finger)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !plane || !grid || !creature || !circle || !circleAsLine || !house || !finger)
      return

    const d = ctx.dimension
    const sp = ctx.sectionProgress
    const onPlane = ctx.section === '2'

    let presence = 0
    let sweep = 0
    let lift = 0

    // Stay off until 2D enter-morph (after 1D hold ends ~1.62)
    if (d < 1.62) {
      presence = 0
    } else if (d < 2) {
      const t = (d - 1.62) / 0.38
      presence = t
      sweep = t
    } else if (d < 2.7) {
      presence = 1
      sweep = 1
      // Lift only as 3D section begins — not during 2D commentary
      lift = d > 2.62 ? (d - 2.62) / 0.38 : 0
    } else if (d < 3.3) {
      presence = Math.max(0, 1 - (d - 2.7) / 0.5)
      sweep = 1
      lift = 1
    }

    const sz = Math.max(0.002, sweep)
    plane.scale.set(1, 1, sz)
    grid.scale.set(1, 1, Math.max(0.002, sweep))

    ;(plane.material as MeshBasicMaterial).opacity = presence * 0.35
    const gm = grid.material
    if (Array.isArray(gm)) gm.forEach((m) => (m.opacity = presence * 0.55))
    else gm.opacity = presence * 0.55

    const fold = lift * 0.35
    const yLift = lift * 0.4
    plane.rotation.x = -Math.PI / 2 + fold
    grid.rotation.x = fold
    plane.position.y = yLift
    grid.position.y = yLift

    // Story beats keyed to 2D section progress so they match copy
    const circleOn = onPlane ? sp >= 0.28 && sp < 0.78 : d >= 1.85 && d < 2.45
    const edgeOnBeat = onPlane ? sp >= 0.58 && sp < 0.78 : d >= 2.1 && d < 2.35
    ;(circle.material as LineBasicMaterial).opacity = circleOn ? presence * (edgeOnBeat ? 0.25 : 0.8) : 0
    ;(circleAsLine.material as LineBasicMaterial).opacity = edgeOnBeat ? presence * 0.95 : 0
    circle.position.y = yLift
    circleAsLine.position.y = yLift
    circle.scale.z = sz
    circleAsLine.scale.z = sz

    // House + creature — late 2D beat (~0.88 copy)
    const houseOn = onPlane ? sp >= 0.78 : d >= 2.35 && d < 2.7
    ;(house.material as LineBasicMaterial).opacity = houseOn ? presence * 0.85 : 0
    house.position.y = yLift
    house.scale.z = sz

    if (houseOn) {
      creature.position.set(-0.9, 0.04 + yLift, 0.7)
      const fingerT = onPlane
        ? Math.min(1, Math.max(0, (sp - 0.78) / 0.12))
        : Math.min(1, Math.max(0, (d - 2.35) / 0.2))
      finger.position.set(-0.9, 1.4 - fingerT * 1.35 + yLift, 0.7)
      finger.material.opacity = presence * fingerT * 0.9
    } else {
      finger.material.opacity = 0
      creature.position.set(
        Math.sin(ctx.time * 0.35 + 1) * 1.1,
        0.04 + yLift,
        Math.cos(ctx.time * 0.3) * 1.1 * sz,
      )
    }
    const creatureOn = onPlane ? sp >= 0.32 && sp < 0.98 : d >= 1.9 && d < 2.7
    creature.material.opacity = creatureOn ? presence * 0.9 : 0
  }

  const dispose = () => {
    if (!mounted) return
    group.clear()
    plane?.geometry.dispose()
    ;(plane?.material as MeshBasicMaterial | undefined)?.dispose()
    grid?.geometry.dispose()
    const gm = grid?.material
    if (Array.isArray(gm)) gm.forEach((m) => m.dispose())
    else gm?.dispose()
    circle?.geometry.dispose()
    ;(circle?.material as LineBasicMaterial | undefined)?.dispose()
    circleAsLine?.geometry.dispose()
    ;(circleAsLine?.material as LineBasicMaterial | undefined)?.dispose()
    house?.geometry.dispose()
    ;(house?.material as LineBasicMaterial | undefined)?.dispose()
    creature?.material.dispose()
    finger?.material.dispose()
    creatureTex?.dispose()
    glowTex?.dispose()
    plane = null
    grid = null
    circle = null
    circleAsLine = null
    house = null
    creature = null
    finger = null
    creatureTex = null
    glowTex = null
    mounted = false
  }

  return {
    name: 'Plane2D',
    group,
    mount,
    update,
    dispose,
    get mounted() {
      return mounted
    },
  }
}
