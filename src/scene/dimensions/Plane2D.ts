import {
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  BoxGeometry,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'
import { Cinema } from '../cinematic/palette'
import { applyPbrMaps, loadPbrSet } from '../cinematic/loaders'

/**
 * 2D — paper plane with sparse PBR props. No GridHelper.
 */
export function createPlane2D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Plane2D'

  let mounted = false
  let plane: Mesh | null = null
  let planeMat: MeshStandardMaterial | null = null
  let circle: Mesh | null = null
  let house: Mesh | null = null
  let creature: Mesh | null = null
  let finger: Mesh | null = null

  const mount = () => {
    if (mounted) return

    planeMat = new MeshStandardMaterial({
      color: new Color(Cinema.paperWarm),
      roughness: 0.85,
      metalness: 0.0,
      transparent: true,
      opacity: 0,
      side: DoubleSide,
    })
    plane = new Mesh(new PlaneGeometry(4.4, 4.4, 1, 1), planeMat)
    plane.rotation.x = -Math.PI / 2
    plane.receiveShadow = false

    circle = new Mesh(
      new TorusGeometry(0.55, 0.012, 10, 48),
      new MeshStandardMaterial({
        color: new Color(Cinema.spacetime),
        emissive: new Color(Cinema.fillCool),
        emissiveIntensity: 0.25,
        roughness: 0.4,
        metalness: 0.3,
        transparent: true,
        opacity: 0,
      }),
    )
    circle.rotation.x = Math.PI / 2
    circle.position.set(1.1, 0.02, -0.2)

    house = new Mesh(
      new BoxGeometry(1.6, 0.04, 1.6),
      new MeshStandardMaterial({
        color: new Color(Cinema.signalDim),
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0,
      }),
    )
    house.position.set(-0.9, 0.03, 0.7)

    creature = new Mesh(
      new SphereGeometry(0.08, 16, 16),
      new MeshStandardMaterial({
        color: new Color(Cinema.signal),
        emissive: new Color(Cinema.spacetimeCore),
        emissiveIntensity: 0.6,
        roughness: 0.35,
        metalness: 0.15,
        transparent: true,
        opacity: 0,
      }),
    )

    finger = new Mesh(
      new SphereGeometry(0.1, 16, 16),
      new MeshStandardMaterial({
        color: new Color(Cinema.eventAmber),
        emissive: new Color(Cinema.eventAmber),
        emissiveIntensity: 0.55,
        roughness: 0.4,
        metalness: 0.2,
        transparent: true,
        opacity: 0,
      }),
    )

    group.add(plane, circle, house, creature, finger)
    mounted = true

    void loadPbrSet('paper', perf).then((maps) => {
      if (planeMat) applyPbrMaps(planeMat, maps, 2)
    })
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !plane || !planeMat || !circle || !house || !creature || !finger) return

    const d = ctx.dimension
    const sp = ctx.sectionProgress
    const onPlane = ctx.section === '2'

    let presence = 0
    let sweep = 0
    let lift = 0

    if (d < 1.62) {
      presence = 0
    } else if (d < 2) {
      const t = (d - 1.62) / 0.38
      presence = t
      sweep = t
    } else if (d < 2.7) {
      presence = 1
      sweep = 1
      lift = d > 2.62 ? (d - 2.62) / 0.38 : 0
    } else if (d < 3.3) {
      presence = Math.max(0, 1 - (d - 2.7) / 0.5)
      sweep = 1
      lift = 1
    }

    const p = presence * presence * (3 - 2 * presence)
    const sz = Math.max(0.002, sweep)
    plane.scale.set(1, 1, sz)
    planeMat.opacity = p * 0.92

    const fold = lift * 0.35
    const yLift = lift * 0.4
    plane.rotation.x = -Math.PI / 2 + fold
    plane.position.y = yLift

    const circleOn = onPlane ? sp >= 0.28 && sp < 0.78 : d >= 1.85 && d < 2.45
    ;(circle.material as MeshStandardMaterial).opacity = circleOn ? p * 0.85 : 0
    circle.position.y = 0.02 + yLift
    circle.scale.set(sz, 1, sz)

    const houseOn = onPlane ? sp >= 0.78 : d >= 2.35 && d < 2.7
    ;(house.material as MeshStandardMaterial).opacity = houseOn ? p * 0.75 : 0
    house.position.y = 0.03 + yLift
    house.scale.set(1, 1, sz)

    if (houseOn) {
      creature.position.set(-0.9, 0.12 + yLift, 0.7)
      const fingerT = onPlane
        ? Math.min(1, Math.max(0, (sp - 0.78) / 0.12))
        : Math.min(1, Math.max(0, (d - 2.35) / 0.2))
      finger.position.set(-0.9, 1.4 - fingerT * 1.25 + yLift, 0.7)
      ;(finger.material as MeshStandardMaterial).opacity = p * fingerT * 0.9
    } else {
      ;(finger.material as MeshStandardMaterial).opacity = 0
      creature.position.set(
        Math.sin(ctx.time * 0.35 + 1) * 1.1,
        0.1 + yLift,
        Math.cos(ctx.time * 0.3) * 1.1 * sz,
      )
    }
    const creatureOn = onPlane ? sp >= 0.32 && sp < 0.98 : d >= 1.9 && d < 2.7
    ;(creature.material as MeshStandardMaterial).opacity = creatureOn ? p * 0.9 : 0
  }

  const dispose = () => {
    if (!mounted) return
    group.clear()
    plane?.geometry.dispose()
    planeMat?.dispose()
    circle?.geometry.dispose()
    ;(circle?.material as MeshStandardMaterial | undefined)?.dispose()
    house?.geometry.dispose()
    ;(house?.material as MeshStandardMaterial | undefined)?.dispose()
    creature?.geometry.dispose()
    ;(creature?.material as MeshStandardMaterial | undefined)?.dispose()
    finger?.geometry.dispose()
    ;(finger?.material as MeshStandardMaterial | undefined)?.dispose()
    plane = null
    planeMat = null
    circle = null
    house = null
    creature = null
    finger = null
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
