import {
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'
import { Cinema } from '../cinematic/palette'
import {
  DimensionAssets,
  applyPbrMaps,
  disposeObject3D,
  loadGlb,
  loadPbrSet,
  setGroupOpacity,
} from '../cinematic/loaders'

const LINE_HALF = 2.2
const OBSTACLE_X = 0.85

/**
 * 1D — metal filament axis with a blocked traveler.
 * Materials from ambientCG metal; optional brass accent as the obstacle mass.
 */
export function createLine1D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Line1D'

  let mounted = false
  let filament: Mesh | null = null
  let traveler: Mesh | null = null
  let endA: Mesh | null = null
  let endB: Mesh | null = null
  let obstacle: Group | Mesh | null = null
  let filamentMat: MeshStandardMaterial | null = null

  const mount = () => {
    if (mounted) return

    filamentMat = new MeshStandardMaterial({
      color: new Color(Cinema.metalSteel),
      roughness: 0.35,
      metalness: 0.85,
      transparent: true,
      opacity: 0,
      emissive: new Color(Cinema.fillCool),
      emissiveIntensity: 0.08,
    })

    filament = new Mesh(new CylinderGeometry(0.018, 0.018, LINE_HALF * 2, 20), filamentMat)
    filament.rotation.z = Math.PI / 2

    const tipMat = new MeshStandardMaterial({
      color: new Color(Cinema.signal),
      emissive: new Color(Cinema.spacetimeCore),
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0,
    })
    traveler = new Mesh(new SphereGeometry(0.055, 20, 20), tipMat.clone())
    endA = new Mesh(new SphereGeometry(0.032, 16, 16), tipMat.clone())
    endB = new Mesh(new SphereGeometry(0.032, 16, 16), tipMat.clone())

    const fallbackObstacle = new Mesh(
      new SphereGeometry(0.09, 20, 20),
      new MeshStandardMaterial({
        color: new Color(Cinema.eventAmber),
        emissive: new Color(Cinema.eventAmber),
        emissiveIntensity: 0.45,
        roughness: 0.4,
        metalness: 0.5,
        transparent: true,
        opacity: 0,
      }),
    )
    fallbackObstacle.position.set(OBSTACLE_X, 0, 0)
    obstacle = fallbackObstacle

    group.add(filament, endA, endB, obstacle, traveler)
    mounted = true

    void loadPbrSet('metal', perf).then((maps) => {
      if (filamentMat && mounted) applyPbrMaps(filamentMat, maps, 3)
    })

    void loadGlb(DimensionAssets.candle)
      .then((model) => {
        if (!mounted) {
          disposeObject3D(model)
          return
        }
        model.scale.setScalar(0.22)
        model.position.set(OBSTACLE_X, -0.12, 0)
        model.rotation.y = Math.PI * 0.25
        setGroupOpacity(model, 0)
        if (obstacle) group.remove(obstacle)
        ;(obstacle as Mesh)?.geometry?.dispose()
        ;((obstacle as Mesh)?.material as MeshStandardMaterial | undefined)?.dispose()
        obstacle = model
        group.add(model)
      })
      .catch(() => {
        /* sphere fallback remains */
      })
  }

  const tmp = new Vector3()

  const update = (ctx: DimensionContext) => {
    if (!filament || !traveler || !endA || !endB || !obstacle || !filamentMat) return

    const d = ctx.dimension
    const sp = ctx.sectionProgress
    const onLine = ctx.section === '1'

    let opacity = 0
    let lengthScale = 0

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

    const p = opacity * opacity * (3 - 2 * opacity)
    const half = LINE_HALF * Math.max(0.002, lengthScale)

    filament.scale.set(1, Math.max(0.002, lengthScale), 1)
    filamentMat.opacity = p

    endA.position.set(-half, 0, 0)
    endB.position.set(half, 0, 0)
    ;(endA.material as MeshStandardMaterial).opacity = p * 0.9
    ;(endB.material as MeshStandardMaterial).opacity = p * 0.9

    const showObstacle = onLine ? sp >= 0.62 && sp < 0.98 : d >= 1.35 && d < 1.85
    obstacle.position.set(OBSTACLE_X * lengthScale, obstacle instanceof Group ? -0.12 : 0, 0)
    if (obstacle instanceof Group) {
      setGroupOpacity(obstacle, showObstacle ? p * 0.95 : 0)
    } else {
      ;(obstacle.material as MeshStandardMaterial).opacity = showObstacle ? p * 0.95 : 0
    }

    let travelX = -half
    const travelerLive = onLine ? sp >= 0.28 : d >= 0.85
    if (travelerLive && d < 2) {
      const phase = onLine ? Math.min(1, (sp - 0.28) / 0.35) : d < 1.15 ? (d - 0.85) / 0.3 : 1
      const raw = -half + (Math.sin(ctx.time * 0.85) * 0.5 + 0.5) * half * 2 * phase
      const maxX = showObstacle ? OBSTACLE_X * lengthScale - 0.14 : half
      travelX = Math.min(raw, maxX)
    }

    traveler.position.copy(tmp.set(travelX, 0, 0))
    ;(traveler.material as MeshStandardMaterial).opacity = p * (travelerLive ? 1 : 0.25)
    ;(traveler.material as MeshStandardMaterial).emissiveIntensity =
      0.7 + Math.sin(ctx.time * 2) * 0.15
  }

  const dispose = () => {
    if (!mounted) return
    mounted = false
    group.clear()
    filament?.geometry.dispose()
    filamentMat?.dispose()
    traveler?.geometry.dispose()
    ;(traveler?.material as MeshStandardMaterial | undefined)?.dispose()
    endA?.geometry.dispose()
    ;(endA?.material as MeshStandardMaterial | undefined)?.dispose()
    endB?.geometry.dispose()
    ;(endB?.material as MeshStandardMaterial | undefined)?.dispose()
    if (obstacle instanceof Group) disposeObject3D(obstacle)
    else {
      ;(obstacle as Mesh | null)?.geometry?.dispose()
      ;((obstacle as Mesh | null)?.material as MeshStandardMaterial | undefined)?.dispose()
    }
    filament = null
    traveler = null
    endA = null
    endB = null
    obstacle = null
    filamentMat = null
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
