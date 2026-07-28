import {
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  BoxGeometry,
} from 'three'
import type { DimensionModule, DimensionContext } from './types'
import type { PerfSettings } from '../../utils/perf'
import { Cinema } from '../cinematic/palette'
import {
  createContinuityHero,
  editorPlayhead,
  type ContinuityHero,
} from './continuityHero'

/**
 * 4D — video-editor stage: preview of man+box + scrubbable timeline filmstrip.
 * A 4D view sees the whole gesture at once, the way an editor sees a clip.
 */
export function createSpacetime4D(perf: PerfSettings): DimensionModule {
  const group = new Group()
  group.name = 'Spacetime4D'

  let mounted = false
  let stage: Group | null = null
  let bezel: Mesh | null = null
  let previewFrame: Mesh | null = null
  let timelineRail: Mesh | null = null
  let playhead: Mesh | null = null
  let filmstrip: Group | null = null
  let hero: ContinuityHero | null = null
  let stripHeroes: ContinuityHero[] = []
  let cells: Mesh[] = []
  const frameCount = perf.tier === 'high' ? 7 : 5

  const mount = () => {
    if (mounted) return

    stage = new Group()
    stage.position.set(0, 0.15, 0)

    bezel = new Mesh(
      new BoxGeometry(3.4, 2.15, 0.06),
      new MeshStandardMaterial({
        color: new Color(0x1a1a1a),
        roughness: 0.55,
        metalness: 0.35,
        transparent: true,
        opacity: 0,
      }),
    )
    bezel.position.set(0, 0.55, -0.4)

    previewFrame = new Mesh(
      new PlaneGeometry(3.05, 1.75),
      new MeshStandardMaterial({
        color: new Color(0x0a0a0a),
        roughness: 0.9,
        metalness: 0,
        transparent: true,
        opacity: 0,
      }),
    )
    previewFrame.position.set(0, 0.55, -0.36)

    timelineRail = new Mesh(
      new BoxGeometry(3.2, 0.08, 0.04),
      new MeshStandardMaterial({
        color: new Color(Cinema.signalDim),
        roughness: 0.6,
        metalness: 0.2,
        transparent: true,
        opacity: 0,
      }),
    )
    timelineRail.position.set(0, -0.75, -0.2)

    playhead = new Mesh(
      new BoxGeometry(0.035, 0.22, 0.05),
      new MeshStandardMaterial({
        color: new Color(Cinema.signal),
        emissive: new Color(Cinema.eventAmber),
        emissiveIntensity: 0.45,
        roughness: 0.4,
        metalness: 0.2,
        transparent: true,
        opacity: 0,
      }),
    )
    playhead.position.set(-1.4, -0.75, -0.16)

    hero = createContinuityHero(perf)
    hero.root.scale.setScalar(0.72)
    hero.root.position.set(0.15, -0.35, 0.15)
    hero.setOpacity(0)

    filmstrip = new Group()
    filmstrip.position.set(0, -1.05, -0.15)
    stripHeroes = []
    cells = []
    for (let i = 0; i < frameCount; i++) {
      const cell = new Mesh(
        new BoxGeometry(0.38, 0.28, 0.02),
        new MeshStandardMaterial({
          color: new Color(0x121212),
          roughness: 0.7,
          metalness: 0.15,
          transparent: true,
          opacity: 0,
        }),
      )
      const x = -1.35 + (i / Math.max(1, frameCount - 1)) * 2.7
      cell.position.set(x, 0, 0)
      filmstrip.add(cell)
      cells.push(cell)

      const h = createContinuityHero(perf)
      h.scrubPickup(i / Math.max(1, frameCount - 1))
      h.root.scale.setScalar(0.22)
      h.root.position.set(x, -0.02, 0.08)
      h.setOpacity(0)
      filmstrip.add(h.root)
      stripHeroes.push(h)
    }

    stage.add(bezel, previewFrame, timelineRail, playhead, hero.root, filmstrip)
    group.add(stage)
    mounted = true
  }

  const update = (ctx: DimensionContext) => {
    if (!mounted || !stage || !bezel || !previewFrame || !timelineRail || !playhead || !hero) return

    const d = ctx.dimension
    let presence = 0
    if (d < 3.55) presence = 0
    else if (d < 4) presence = (d - 3.55) / 0.45
    else if (d < 4.7) presence = 1
    else if (d < 5.25) presence = 1 - (d - 4.7) / 0.55
    else presence = 0

    const p = presence * presence * (3 - 2 * presence)
    ;(bezel.material as MeshStandardMaterial).opacity = p * 0.92
    ;(previewFrame.material as MeshStandardMaterial).opacity = p * 0.55
    ;(timelineRail.material as MeshStandardMaterial).opacity = p * 0.55
    ;(playhead.material as MeshStandardMaterial).opacity = p * 0.95

    const headT =
      ctx.section === '4' ? editorPlayhead(ctx.sectionProgress) : MathUtils.clamp(ctx.sectionProgress, 0, 1)
    hero.scrubPickup(headT, ctx.time, 0.4)
    hero.setOpacity(p)

    playhead.position.x = MathUtils.lerp(-1.4, 1.4, headT)

    for (let i = 0; i < stripHeroes.length; i++) {
      const h = stripHeroes[i]
      const frameT = i / Math.max(1, frameCount - 1)
      const dist = Math.abs(frameT - headT)
      const focus = MathUtils.clamp(1 - dist * 2.2, 0.25, 1)
      h.scrubPickup(frameT, ctx.time * 0.4, i * 0.9)
      h.setOpacity(p * 0.55 * focus)
      const cell = cells[i]
      if (cell) {
        ;(cell.material as MeshStandardMaterial).opacity = p * 0.7 * focus
      }
    }

    stage.position.y = MathUtils.lerp(0.35, 0.1, p)
    group.rotation.y = p * Math.sin(ctx.time * 0.08) * 0.06
  }

  const dispose = () => {
    if (!mounted) return
    hero?.dispose()
    for (const h of stripHeroes) h.dispose()
    stripHeroes = []
    hero = null
    group.clear()
    bezel?.geometry.dispose()
    ;(bezel?.material as MeshStandardMaterial | undefined)?.dispose()
    previewFrame?.geometry.dispose()
    ;(previewFrame?.material as MeshStandardMaterial | undefined)?.dispose()
    timelineRail?.geometry.dispose()
    ;(timelineRail?.material as MeshStandardMaterial | undefined)?.dispose()
    playhead?.geometry.dispose()
    ;(playhead?.material as MeshStandardMaterial | undefined)?.dispose()
    for (const cell of cells) {
      cell.geometry.dispose()
      ;(cell.material as MeshStandardMaterial).dispose()
    }
    cells = []
    stage = null
    bezel = null
    previewFrame = null
    timelineRail = null
    playhead = null
    filmstrip = null
    mounted = false
  }

  return {
    name: 'Spacetime4D',
    group,
    mount,
    update,
    dispose,
    get mounted() {
      return mounted
    },
  }
}
