import {
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  BoxGeometry,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'
import { Cinema } from '../cinematic/palette'
import {
  createContinuityHero,
  type ContinuityHero,
  type PickupOutcome,
} from './continuityHero'

const OUTCOMES: PickupOutcome[] = ['lift', 'leave', 'drop', 'never']

/**
 * 5D — alternate takes: editor sprouts multiple timeline tracks of the same pickup.
 */
export function createBranching5D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Branching5D'

  let mounted = false
  let stage: Group | null = null
  let tracks: Group | null = null
  let takes: { hero: ContinuityHero; rail: Mesh; outcome: PickupOutcome }[] = []
  let preview: ContinuityHero | null = null

  const mount = () => {
    if (mounted) return

    stage = new Group()
    tracks = new Group()
    tracks.position.set(0, -0.55, 0)

    preview = createContinuityHero(perf)
    preview.root.scale.setScalar(0.65)
    preview.root.position.set(0, 0.35, 0.2)
    preview.setOutcome('lift', 1)
    preview.setOpacity(0)

    takes = []
    const n = Math.min(OUTCOMES.length, perf.tier === 'high' ? 4 : 3)
    for (let i = 0; i < n; i++) {
      const outcome = OUTCOMES[i]
      const y = -i * 0.42
      const rail = new Mesh(
        new BoxGeometry(3.0, 0.07, 0.03),
        new MeshStandardMaterial({
          color: new Color(i === 0 ? Cinema.signal : Cinema.signalDim),
          roughness: 0.55,
          metalness: 0.2,
          transparent: true,
          opacity: 0,
        }),
      )
      rail.position.set(0, y, -0.25)

      const hero = createContinuityHero(perf)
      hero.root.scale.setScalar(0.28)
      hero.root.position.set(-0.2 + i * 0.15, y + 0.05, 0.1)
      hero.setOutcome(outcome, 1)
      hero.setOpacity(0)

      tracks.add(rail, hero.root)
      takes.push({ hero, rail, outcome })
    }

    stage.add(preview.root, tracks)
    group.add(stage)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !stage || !tracks || !preview) return

    const d = ctx.dimension
    let presence = 0
    let grow = 0
    if (d < 4.55) presence = 0
    else if (d < 5) {
      grow = (d - 4.55) / 0.45
      presence = grow
    } else if (d < 5.7) {
      presence = 1
      grow = 1
    } else if (d < 6.25) {
      presence = 1 - (d - 5.7) / 0.55
      grow = 1
    }

    const p = presence * presence * (3 - 2 * presence)
    const reveal = Math.floor(grow * takes.length + 0.001)

    // Active take follows section progress
    const active = Math.min(
      takes.length - 1,
      Math.floor(MathUtils.clamp(ctx.sectionProgress, 0, 0.999) * takes.length),
    )
    preview.setOutcome(takes[active]?.outcome ?? 'lift', 1, ctx.time, 0.5)
    preview.setOpacity(p)

    for (let i = 0; i < takes.length; i++) {
      const { hero, rail, outcome } = takes[i]
      const vis = i < reveal ? 1 : MathUtils.clamp((grow * takes.length - i) * 2, 0, 1)
      const focus = i === active ? 1 : 0.4
      hero.setOutcome(outcome, 1, ctx.time * 0.85, i * 1.2)
      hero.setOpacity(p * vis * focus)
      ;(rail.material as MeshStandardMaterial).opacity = p * vis * (0.35 + focus * 0.45)
      hero.root.position.x = MathUtils.lerp(-0.9, 0.9, (i + 0.5) / takes.length)
    }

    stage.position.y = MathUtils.lerp(0.4, 0, p)
    group.rotation.y = p * Math.sin(ctx.time * 0.07) * 0.05
  }

  const dispose = () => {
    if (!mounted) return
    preview?.dispose()
    for (const t of takes) {
      t.hero.dispose()
      t.rail.geometry.dispose()
      ;(t.rail.material as MeshStandardMaterial).dispose()
    }
    takes = []
    preview = null
    group.clear()
    stage = null
    tracks = null
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
