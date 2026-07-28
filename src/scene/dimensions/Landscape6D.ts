import { Group, MathUtils } from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'
import { createContinuityHero, type ContinuityHero } from './continuityHero'

const WARPS: Array<'float' | 'sink' | 'crush' | 'drift'> = ['float', 'sink', 'crush', 'drift']

/**
 * 6D — same man+box under warped physics (not new takes — new constants).
 * Clones scrub through the pickup with phase offsets so they stay alive, then
 * fade before 7D catalog takes over (avoids stacked multi-limb silhouettes).
 */
export function createLandscape6D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Landscape6D'

  let mounted = false
  let field: Group | null = null
  let clones: ContinuityHero[] = []
  let phases: number[] = []

  const mount = () => {
    if (mounted) return

    field = new Group()
    const n = perf.tier === 'high' ? 4 : 3
    clones = []
    phases = []
    for (let i = 0; i < n; i++) {
      const hero = createContinuityHero(perf)
      const phase = i * 1.7
      hero.scrubPickup(0.55 + i * 0.1, 0, phase)
      hero.root.scale.setScalar(0.55)
      const x = (i - (n - 1) / 2) * 1.55
      hero.root.position.set(x, 0, -0.2 + (i % 2) * 0.25)
      hero.setPhysicsWarp(WARPS[i % WARPS.length], 0)
      hero.setOpacity(0)
      field.add(hero.root)
      clones.push(hero)
      phases.push(phase)
    }

    group.add(field)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !field) return

    const d = ctx.dimension
    let presence = 0
    // Exit early as 7D catalog enters (~6.55) so warped giants don't stack on the shelf
    if (d < 5.55) presence = 0
    else if (d < 6) presence = (d - 5.55) / 0.45
    else if (d < 6.5) presence = 1
    else if (d < 6.85) presence = 1 - (d - 6.5) / 0.35
    else presence = 0

    if (ctx.section === 'coda') {
      presence *= Math.max(0, 1 - ctx.sectionProgress / 0.22)
    }

    const p = presence * presence * (3 - 2 * presence)
    const warpAmt =
      ctx.section === '6'
        ? MathUtils.smoothstep(ctx.sectionProgress, 0.15, 0.85)
        : MathUtils.clamp((d - 5.8) / 0.7, 0, 1)

    for (let i = 0; i < clones.length; i++) {
      const hero = clones[i]
      const phase = phases[i]
      const life = ctx.time * (0.7 + i * 0.05)
      const n = clones.length
      const x = (i - (n - 1) / 2) * 1.55
      const z = -0.2 + (i % 2) * 0.25
      // Ping-pong pickup so every clone moves full-body, not a frozen one-arm pose
      const cycle = (ctx.time * 0.18 + phase) % 2
      const t = cycle < 1 ? cycle : 2 - cycle
      // Unwarped placement → pose → re-assert placement → warp once (avoids stacking at origin)
      hero.root.position.set(x, 0, z)
      hero.root.scale.setScalar(0.55)
      hero.root.rotation.z = 0
      hero.setPhysicsWarp('normal', 0)
      hero.scrubPickup(0.15 + t * 0.8, life, phase)
      hero.root.position.set(x, 0, z)
      hero.root.scale.setScalar(0.55)
      hero.root.rotation.z = 0
      hero.setPhysicsWarp(WARPS[i % WARPS.length], warpAmt * p)
      hero.setOpacity(p * (0.55 + (i === 0 ? 0.35 : 0.15)))
      hero.root.rotation.y = ctx.time * 0.08 * (i % 2 === 0 ? 1 : -1) * p
    }

    field.rotation.y = ctx.time * 0.03 * p
    group.scale.setScalar(0.85 + p * 0.2)
  }

  const dispose = () => {
    if (!mounted) return
    for (const h of clones) h.dispose()
    clones = []
    phases = []
    group.clear()
    field = null
    mounted = false
  }

  return {
    name: 'Landscape6D',
    group,
    mount,
    update,
    dispose,
    get mounted() {
      return mounted
    },
  }
}
