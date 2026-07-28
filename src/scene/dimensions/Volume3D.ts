import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'
import { Cinema } from '../cinematic/palette'
import { applyPbrMaps, loadPbrSet } from '../cinematic/loaders'
import { createContinuityHero, type ContinuityHero } from './continuityHero'

/**
 * 3D — plane extrudes into a solid box; man reaches in and picks it up.
 * Continuity hero (man + Poly Haven box) is born here for 4D→7D reuse silhouette.
 */
export function createVolume3D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Volume3D'

  let mounted = false
  let ground: Mesh | null = null
  let groundMat: MeshStandardMaterial | null = null
  let hero: ContinuityHero | null = null
  let dust: Points | null = null

  const mount = () => {
    if (mounted) return

    groundMat = new MeshStandardMaterial({
      color: new Color(Cinema.plaster),
      roughness: 0.92,
      metalness: 0.02,
      transparent: true,
      opacity: 0,
    })
    ground = new Mesh(new PlaneGeometry(4.2, 4.2), groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0

    const count = Math.floor(perf.particleCount * 0.35)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.2
      positions[i * 3 + 1] = Math.random() * 1.6
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3.2
    }
    dust = new Points(
      new BufferGeometry().setAttribute('position', new BufferAttribute(positions, 3)),
      new PointsMaterial({
        color: new Color(Cinema.signalDim),
        size: 0.022,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    )

    hero = createContinuityHero(perf)
    hero.root.position.set(0, 0, 0)
    hero.setOpacity(0)

    group.add(ground, dust, hero.root)
    mounted = true

    void loadPbrSet('plaster', perf).then((maps) => {
      if (groundMat && mounted) applyPbrMaps(groundMat, maps, 2.2)
    })
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !ground || !groundMat || !dust || !hero) return

    const d = ctx.dimension
    const sp = ctx.sectionProgress
    const coda = ctx.section === 'coda'

    let presence = 0
    let extrude = 0
    let pickupT = 0

    if (coda) {
      const t = MathUtils.smoothstep(sp, 0.08, 0.32)
      presence = t
      extrude = 1
      pickupT = 0.92
    } else if (d < 2.62) {
      presence = 0
    } else if (d < 3) {
      const t = (d - 2.62) / 0.38
      presence = t
      extrude = MathUtils.smoothstep(t, 0, 0.85)
      pickupT = 0
    } else if (d < 3.7) {
      presence = 1
      extrude = 1
      // Form box, then man enters and picks up — driven by section progress on dim 3
      if (ctx.section === '3') {
        const form = MathUtils.smoothstep(sp, 0, 0.28)
        extrude = form
        pickupT = MathUtils.smoothstep(sp, 0.28, 0.92)
      } else {
        pickupT = MathUtils.clamp((d - 3) / 0.55, 0, 1)
      }
    } else if (d < 4.35) {
      presence = 1 - (d - 3.7) / 0.65
      extrude = 1
      pickupT = 1
    } else {
      presence = 0
      extrude = 1
      pickupT = 1
    }

    const p = presence * presence * (3 - 2 * presence)

    groundMat.opacity = p * 0.75
    ;(dust.material as PointsMaterial).opacity = coda ? p * 0.18 : p * 0.28

    hero.scrubPickup(pickupT, ctx.time, 0.2)
    const box = hero.box
    if (box) {
      const base = 1.15
      if (pickupT < 0.12) {
        box.scale.set(base, base * Math.max(0.04, extrude), base)
      } else {
        box.scale.setScalar(base)
      }
    }

    hero.setOpacity(p)
    hero.root.visible = p > 0.02

    if (coda || (d >= 2.7 && d < 4.2)) {
      const settle = coda ? presence : Math.min(1, Math.max(0, (d - 2.7) / 0.35))
      group.rotation.y = settle * Math.sin(ctx.time * 0.12) * 0.12
    } else {
      group.rotation.set(0, 0, 0)
    }
  }

  const dispose = () => {
    if (!mounted) return
    mounted = false
    hero?.dispose()
    hero = null
    group.clear()
    ground?.geometry.dispose()
    groundMat?.dispose()
    dust?.geometry.dispose()
    ;(dust?.material as PointsMaterial | undefined)?.dispose()
    ground = null
    groundMat = null
    dust = null
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
