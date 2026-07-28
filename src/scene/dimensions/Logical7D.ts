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

/**
 * 7D — catalog of man+box relations; density then collapse toward points / coda grasp.
 * Each shelf entry keeps its outcome but breathes and micro-animates so the grid feels alive.
 */
export function createLogical7D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Logical7D'

  let mounted = false
  let shelf: Group | null = null
  let entries: ContinuityHero[] = []
  let outcomes: PickupOutcome[] = []
  let markers: Mesh[] = []
  let phases: number[] = []

  const mount = () => {
    if (mounted) return

    shelf = new Group()
    const cols = perf.tier === 'high' ? 5 : 4
    const rows = perf.tier === 'high' ? 4 : 3
    entries = []
    outcomes = []
    markers = []
    phases = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        const hero = createContinuityHero(perf)
        const outcome = (['lift', 'leave', 'drop', 'never'] as const)[i % 4]
        const phase = i * 0.73 + r * 0.31
        hero.setOutcome(outcome, 0.7 + (i % 5) * 0.06, 0, phase)
        hero.root.scale.setScalar(0.18)
        const x = (c - (cols - 1) / 2) * 0.85
        const y = (r - (rows - 1) / 2) * 0.75
        hero.root.position.set(x, y, -0.2)
        hero.setOpacity(0)
        shelf.add(hero.root)
        entries.push(hero)
        outcomes.push(outcome)
        phases.push(phase)

        const dot = new Mesh(
          new BoxGeometry(0.04, 0.04, 0.04),
          new MeshStandardMaterial({
            color: new Color(Cinema.lattice),
            emissive: new Color(Cinema.fillCool),
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0,
          }),
        )
        dot.position.set(x, y, -0.2)
        shelf.add(dot)
        markers.push(dot)
      }
    }

    group.add(shelf)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !shelf) return

    const d = ctx.dimension
    let presence = 0
    let enter = 0
    if (d < 6.55) presence = 0
    else if (d < 7) {
      enter = (d - 6.55) / 0.45
      presence = enter
    } else {
      presence = 1
      enter = 1
    }

    const codaT = ctx.section === 'coda' ? MathUtils.clamp(ctx.sectionProgress, 0, 1) : 0
    const collapse = ctx.section === 'coda' ? MathUtils.smoothstep(codaT, 0, 0.35) : 0
    const catalogFade =
      ctx.section === 'coda' ? 1 - MathUtils.smoothstep(codaT, 0, 0.28) : 1

    if (ctx.section === 'coda') {
      presence = catalogFade
      enter = 1
    }

    const p = presence * presence * (3 - 2 * presence)
    const densify = MathUtils.smoothstep(enter, 0, 1)

    for (let i = 0; i < entries.length; i++) {
      const hero = entries[i]
      const delay = (i % 7) / 14
      const local = MathUtils.clamp((densify - delay) / 0.7, 0, 1)
      const show = local * local * (3 - 2 * local)

      const c = collapse * collapse * (3 - 2 * collapse)
      const cols = perf.tier === 'high' ? 5 : 4
      const rows = perf.tier === 'high' ? 4 : 3
      const col = i % cols
      const row = Math.floor(i / cols)
      const ox = (col - (cols - 1) / 2) * 0.85
      const oy = (row - (rows - 1) / 2) * 0.75

      // Staggered life — each copy holds its outcome but keeps breathing / micro-reaching
      const phase = phases[i]
      const life = ctx.time * (0.55 + (i % 3) * 0.08)
      // Slow full-gesture pulse so "never/leave" copies aren't frozen mid A-pose
      const cycle = (ctx.time * 0.12 + phase) % 4
      const gesture =
        cycle < 2
          ? MathUtils.smoothstep(cycle, 0, 2)
          : 1 - MathUtils.smoothstep(cycle, 2, 4)
      const outcome = outcomes[i]
      if (outcome === 'lift' || outcome === 'drop') {
        hero.setOutcome(outcome, 0.75 + gesture * 0.25, life, phase)
      } else {
        // leave / never: oscillate through a partial reach so both arms + legs move
        hero.setOutcome(outcome, 0.55 + gesture * 0.45, life, phase)
      }

      hero.root.position.set(ox * (1 - c * 0.9), oy * (1 - c * 0.9), -0.2)
      hero.root.rotation.y = Math.sin(life * 0.35 + phase) * 0.08 * show * (1 - c)
      hero.root.scale.setScalar(MathUtils.lerp(0.18, 0.02, c))
      hero.setOpacity(p * show * (1 - c * 0.95) * catalogFade)

      const marker = markers[i]
      marker.position.copy(hero.root.position)
      ;(marker.material as MeshStandardMaterial).opacity = p * c * catalogFade * 0.8
      marker.scale.setScalar(0.6 + c * 1.4)
    }

    if (ctx.section === 'coda') {
      group.rotation.y = Math.sin(ctx.time * 0.12) * 0.1 * (1 - collapse)
      group.scale.setScalar(1)
    } else {
      group.rotation.y = ctx.time * 0.025 * p
      group.scale.setScalar(0.9 + densify * 0.15)
    }
  }

  const dispose = () => {
    if (!mounted) return
    for (const h of entries) h.dispose()
    for (const m of markers) {
      m.geometry.dispose()
      ;(m.material as MeshStandardMaterial).dispose()
    }
    entries = []
    outcomes = []
    phases = []
    markers = []
    group.clear()
    shelf = null
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
