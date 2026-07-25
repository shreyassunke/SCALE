import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  EdgesGeometry,
  Group,
  LineSegments,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Points,
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'

export function createVolume3D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Volume3D'

  let mounted = false
  let cubeFill: Mesh | null = null
  let cubeEdges: LineSegments | null = null
  let safe: LineSegments | null = null
  let safeDoor: LineSegments | null = null
  let roomDust: Points | null = null

  const mount = () => {
    if (mounted) return

    // Same 2.2 room as the initial 3D beat — framing must match
    const box = new BoxGeometry(2.2, 2.2, 2.2)
    cubeFill = new Mesh(
      box,
      new MeshBasicMaterial({
        color: new Color('#142436'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    )

    cubeEdges = new LineSegments(
      new EdgesGeometry(box),
      new LineBasicMaterial({
        color: new Color('#c5e2ff'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )

    const safeBox = new BoxGeometry(0.55, 0.45, 0.45)
    safe = new LineSegments(
      new EdgesGeometry(safeBox),
      new LineBasicMaterial({
        color: new Color('#e8c89a'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    safe.position.set(0.55, -0.55, 0.4)

    const doorGeo = new BufferGeometry()
    doorGeo.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          0.275, -0.2, 0.225, 0.275, 0.2, 0.225, 0.275, 0.2, 0.225, 0.275, 0.2, -0.225, 0.275, 0.2,
          -0.225, 0.275, -0.2, -0.225, 0.275, -0.2, -0.225, 0.275, -0.2, 0.225,
        ]),
        3,
      ),
    )
    safeDoor = new LineSegments(
      doorGeo,
      new LineBasicMaterial({
        color: new Color('#ffd7a8'),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    )
    safeDoor.position.copy(safe.position)

    const count = Math.floor(perf.particleCount * 0.6)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2
    }
    roomDust = new Points(
      new BufferGeometry().setAttribute('position', new BufferAttribute(positions, 3)),
      new PointsMaterial({
        color: new Color('#8eb6d8'),
        size: 0.03,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
        sizeAttenuation: true,
      }),
    )

    group.add(cubeFill, cubeEdges, safe, safeDoor, roomDust)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !cubeFill || !cubeEdges || !safe || !safeDoor || !roomDust) return

    const d = ctx.dimension

    let presence = 0
    let extrude = 0

    const sp = ctx.sectionProgress
    const onVolume = ctx.section === '3'

    if (ctx.section === 'coda') {
      // Must be solid by the "Back to three" beat (~0.28)
      const t = MathUtils.smoothstep(sp, 0.08, 0.28)
      presence = t
      extrude = 1
    } else if (d < 2.62) {
      presence = 0
    } else if (d < 3) {
      const t = (d - 2.62) / 0.38
      presence = t
      extrude = t
    } else if (d < 3.7) {
      presence = 1
      extrude = 1
    } else if (d < 4.3) {
      presence = 1 - (d - 3.7) / 0.6
      extrude = 1
    } else {
      presence = 0
      extrude = 1
    }

    group.scale.setScalar(1)

    const h = Math.max(0.002, extrude)
    cubeFill.scale.set(1, h, 1)
    cubeEdges.scale.set(1, h, 1)
    roomDust.scale.set(1, h, 1)
    safe.scale.set(1, h, 1)
    safeDoor.scale.set(1, h, 1)

    ;(cubeFill.material as MeshBasicMaterial).opacity = presence * 0.22
    ;(cubeEdges.material as LineBasicMaterial).opacity = presence * 0.85
    ;(roomDust.material as PointsMaterial).opacity =
      ctx.section === 'coda' ? presence * 0.25 : presence * 0.45

    const shellBeat = ctx.section === 'coda' || (onVolume && sp >= 0.58) || (d >= 3.25 && d < 3.7)
    ;(safe.material as LineBasicMaterial).opacity = shellBeat ? presence * 0.9 : presence * 0.25
    ;(safeDoor.material as LineBasicMaterial).opacity = shellBeat ? presence * 0.75 : 0

    // Same gentle settle as the initial 3D beat
    if (ctx.section === 'coda' || (d >= 2.7 && d < 4.2)) {
      const settle = ctx.section === 'coda' ? presence : Math.min(1, Math.max(0, (d - 2.7) / 0.35))
      group.rotation.y = settle * Math.sin(ctx.time * 0.15) * 0.25
      group.rotation.x = settle * 0.12
    } else {
      group.rotation.set(0, 0, 0)
    }
  }

  const dispose = () => {
    if (!mounted) return
    group.clear()
    cubeFill?.geometry.dispose()
    ;(cubeFill?.material as MeshBasicMaterial | undefined)?.dispose()
    cubeEdges?.geometry.dispose()
    ;(cubeEdges?.material as LineBasicMaterial | undefined)?.dispose()
    safe?.geometry.dispose()
    ;(safe?.material as LineBasicMaterial | undefined)?.dispose()
    safeDoor?.geometry.dispose()
    ;(safeDoor?.material as LineBasicMaterial | undefined)?.dispose()
    roomDust?.geometry.dispose()
    ;(roomDust?.material as PointsMaterial | undefined)?.dispose()
    cubeFill = null
    cubeEdges = null
    safe = null
    safeDoor = null
    roomDust = null
    mounted = false
  }

  return {
    name: 'Volume3D',
    group,
    mount,
    update,
    dispose,
    get mounted() {
      return mounted
    },
  }
}
