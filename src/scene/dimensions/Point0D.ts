import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  SphereGeometry,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'
import { Cinema } from '../cinematic/palette'
import {
  DimensionAssets,
  disposeObject3D,
  loadGlb,
  setGroupOpacity,
} from '../cinematic/loaders'

/**
 * 0D — singular presence in the void.
 * Hero: Poly Haven ceramic vase; soft emissive core as point-of-existence glue.
 */
export function createPoint0D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Point0D'

  let mounted = false
  let hero: Group | null = null
  let core: Mesh | null = null
  let shell: Mesh | null = null
  let dust: Points | null = null

  const mount = () => {
    if (mounted) return

    const coreMat = new MeshStandardMaterial({
      color: new Color(Cinema.signal),
      emissive: new Color(Cinema.spacetimeCore),
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0,
    })
    core = new Mesh(new SphereGeometry(0.045, 24, 24), coreMat)

    const shellMat = new MeshStandardMaterial({
      color: new Color(Cinema.spacetime),
      emissive: new Color(Cinema.fillCool),
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.15,
      transparent: true,
      opacity: 0,
    })
    shell = new Mesh(new SphereGeometry(0.14, 32, 32), shellMat)

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
    dust = new Points(
      new BufferGeometry().setAttribute('position', new BufferAttribute(positions, 3)),
      new PointsMaterial({
        color: new Color(Cinema.signalDim),
        size: 0.02,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    )

    group.add(dust, shell, core)
    mounted = true

    void loadGlb(DimensionAssets.orb)
      .then((model) => {
        if (!mounted) {
          disposeObject3D(model)
          return
        }
        hero = model
        hero.scale.setScalar(0.55)
        hero.position.set(0, -0.35, 0)
        setGroupOpacity(hero, 0)
        group.add(hero)
      })
      .catch(() => {
        /* core + shell still read as a point */
      })
  }

  const update = (ctx: DimensionContext) => {
    if (!core || !shell || !dust) return

    const d = ctx.dimension
    const pointPresence = d < 0.2 ? 1 : d < 1 ? 1 - (d - 0.2) / 0.8 : 0
    const stretch = d < 0.25 ? 0 : d < 1 ? Math.max(0, (d - 0.25) / 0.75) : 1
    const p = pointPresence * pointPresence * (3 - 2 * pointPresence)

    const coreMat = core.material as MeshStandardMaterial
    const shellMat = shell.material as MeshStandardMaterial
    coreMat.opacity = p
    shellMat.opacity = p * (0.55 - stretch * 0.4)
    core.scale.setScalar(1 - stretch * 0.4)
    shell.scale.set(1 + stretch * 4.5, 1 - stretch * 0.65, 1 - stretch * 0.4)

    if (hero) {
      setGroupOpacity(hero, p * (1 - stretch * 0.85))
      hero.scale.setScalar(0.55 * (1 - stretch * 0.5))
      hero.rotation.y = ctx.time * 0.08 * p
    }

    ;(dust.material as PointsMaterial).opacity = 0.08 + p * 0.22

    if (d < 0.35 && perf.enableSoftGlow) {
      const pulse = 1 + Math.sin(ctx.time * 1.1) * 0.04
      core.scale.setScalar(pulse * (1 - stretch * 0.4))
      coreMat.emissiveIntensity = 1.2 + Math.sin(ctx.time * 1.1) * 0.25
    }
  }

  const dispose = () => {
    if (!mounted) return
    mounted = false
    group.clear()
    core?.geometry.dispose()
    ;(core?.material as MeshStandardMaterial | undefined)?.dispose()
    shell?.geometry.dispose()
    ;(shell?.material as MeshStandardMaterial | undefined)?.dispose()
    dust?.geometry.dispose()
    ;(dust?.material as PointsMaterial | undefined)?.dispose()
    if (hero) disposeObject3D(hero)
    core = null
    shell = null
    dust = null
    hero = null
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
