import {
  AmbientLight,
  Color,
  Fog,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Vector3,
  MathUtils,
} from 'three'
import type { PerfSettings } from '../utils/perf'
import type { ScrollState } from '../scroll/scrollEngine'
import type { DimensionModule } from './dimensions/types'
import { createPoint0D } from './dimensions/Point0D'
import { createLine1D } from './dimensions/Line1D'
import { createPlane2D } from './dimensions/Plane2D'
import { createVolume3D } from './dimensions/Volume3D'
import { createSpacetime4D } from './dimensions/Spacetime4D'
import { createBranching5D } from './dimensions/Branching5D'
import { createLandscape6D } from './dimensions/Landscape6D'
import { createLogical7D } from './dimensions/Logical7D'

export type DimensionScene = {
  renderer: WebGLRenderer
  update: (state: ScrollState, time: number) => void
  resize: (w: number, h: number) => void
  dispose: () => void
}

type CamKeyframe = {
  at: number
  position: Vector3
  lookAt: Vector3
}

const CAMERA_PATH: CamKeyframe[] = [
  { at: 0, position: new Vector3(0, 0, 3.2), lookAt: new Vector3(0, 0, 0) },
  { at: 1, position: new Vector3(0.2, 0.35, 4.2), lookAt: new Vector3(0, 0, 0) },
  { at: 2, position: new Vector3(1.2, 2.4, 3.6), lookAt: new Vector3(0, 0, 0) },
  { at: 3, position: new Vector3(3.2, 2.2, 3.8), lookAt: new Vector3(0, 0, 0) },
  // 4D: slight side angle so the worm reads as a volume, not a flat strip
  { at: 4, position: new Vector3(0.85, 1.05, 5.2), lookAt: new Vector3(0.1, 0.1, 0) },
  { at: 5, position: new Vector3(0.15, 1.35, 6.3), lookAt: new Vector3(0, 0.35, 0) },
  // 6D: pull back into the tunnel
  { at: 6, position: new Vector3(0, 0.35, 6.8), lookAt: new Vector3(0, 0, -0.4) },
  { at: 7, position: new Vector3(0.2, 0.15, 5.4), lookAt: new Vector3(0, 0, 0) },
  { at: 7.35, position: new Vector3(0, 0, 4.2), lookAt: new Vector3(0, 0, 0) },
]

const BG_BASE = new Color('#000000')
const BG_DEEP = new Color('#000000')
const _bg = new Color()

const _camPos = new Vector3()
const _camLook = new Vector3()
const _lookSmooth = new Vector3(0, 0, 0)
const _homePos = new Vector3(3.2, 2.2, 3.8)
const _homeLook = new Vector3(0, 0, 0)
const _codaFromPos = new Vector3()
const _codaFromLook = new Vector3()

function sampleCamera(dimension: number, outPos: Vector3, outLook: Vector3) {
  const d = MathUtils.clamp(dimension, CAMERA_PATH[0].at, CAMERA_PATH[CAMERA_PATH.length - 1].at)
  let i = 0
  while (i < CAMERA_PATH.length - 1 && CAMERA_PATH[i + 1].at < d) i++
  const a = CAMERA_PATH[i]
  const b = CAMERA_PATH[Math.min(i + 1, CAMERA_PATH.length - 1)]
  const span = b.at - a.at || 1
  const t = MathUtils.clamp((d - a.at) / span, 0, 1)
  const smooth = t * t * (3 - 2 * t)
  outPos.copy(a.position).lerp(b.position, smooth)
  outLook.copy(a.lookAt).lerp(b.lookAt, smooth)
}

function shouldBeMounted(
  name: string,
  dimension: number,
  section: string,
  progress: number,
): boolean {
  const coda = section === 'coda'
  // Mount windows match holdDimension() — next dim stays unmounted
  // until its own section's enter-morph begins.
  switch (name) {
    case 'Point0D':
      return !coda && dimension < 1.55
    case 'Line1D':
      return !coda && dimension > 0.25 && dimension < 2.55
    case 'Plane2D':
      return !coda && dimension > 1.55 && dimension < 3.55
    case 'Volume3D':
      return coda || (dimension > 2.55 && dimension < 4.55)
    case 'Spacetime4D':
      return !coda && dimension > 3.55 && dimension < 5.55
    case 'Branching5D':
      return !coda && dimension > 4.55 && dimension < 6.55
    case 'Landscape6D':
      return !coda && dimension > 5.55 && dimension < 7.4
    case 'Logical7D':
      // Collapse early, then dispose so only the solid room remains
      return coda ? progress < 0.42 : dimension > 6.55
    default:
      return true
  }
}

export function createScene(canvas: HTMLCanvasElement, perf: PerfSettings): DimensionScene {
  const scene = new Scene()
  scene.background = BG_BASE.clone()
  // Soft depth fog — stronger past 3D so overlapping dims separate cleanly
  scene.fog = new Fog('#000000', 8, 22)

  const camera = new PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0, 3.2)

  const renderer = new WebGLRenderer({
    canvas,
    antialias: perf.tier === 'high',
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(perf.pixelRatio)
  renderer.setClearColor(BG_BASE, 1)

  scene.add(new AmbientLight(0xffffff, 0.55))

  const modules: DimensionModule[] = [
    createPoint0D(perf),
    createLine1D(),
    createPlane2D(),
    createVolume3D(perf),
    createSpacetime4D(perf),
    createBranching5D(perf),
    createLandscape6D(perf),
    createLogical7D(perf),
  ]

  for (const mod of modules) {
    scene.add(mod.group)
  }

  modules[0].mount()

  const update = (state: ScrollState, time: number) => {
    const { dimension, progress, globalProgress } = state

    for (const mod of modules) {
      const want = shouldBeMounted(mod.name, dimension, state.section, progress)
      if (want && !mod.mounted) mod.mount()
      if (!want && mod.mounted) mod.dispose()
      if (mod.mounted) {
        mod.update({
          dimension,
          sectionProgress: progress,
          globalProgress,
          time,
          perf,
          section: state.section,
        })
      }
    }

    // Coda: ease camera from 7D view → exact initial 3D framing (keyframe at 3)
    if (state.section === 'coda') {
      const camT = MathUtils.smoothstep(progress, 0.02, 0.32)
      sampleCamera(7.35, _codaFromPos, _codaFromLook)
      _camPos.copy(_codaFromPos).lerp(_homePos, camT)
      _camLook.copy(_codaFromLook).lerp(_homeLook, camT)
    } else {
      sampleCamera(dimension, _camPos, _camLook)
    }
    const camLerp = state.section === 'coda' ? 0.18 : dimension >= 3.5 ? 0.16 : 0.12
    camera.position.lerp(_camPos, camLerp)
    _lookSmooth.lerp(_camLook, camLerp)
    camera.lookAt(_lookSmooth)

    // Deepen void past 3D; coda clears haze as we return home
    let deep = MathUtils.clamp((dimension - 3.2) / 3.5, 0, 1)
    if (state.section === 'coda') {
      deep *= 1 - MathUtils.smoothstep(progress, 0.1, 0.5)
    }
    _bg.copy(BG_BASE).lerp(BG_DEEP, deep * 0.85)
    scene.background = _bg
    renderer.setClearColor(_bg, 1)
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(_bg)
      scene.fog.near = MathUtils.lerp(9, 5.5, deep)
      scene.fog.far = MathUtils.lerp(24, 16, deep)
    }

    renderer.render(scene, camera)
  }

  const resize = (w: number, h: number) => {
    camera.aspect = w / Math.max(h, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }

  const dispose = () => {
    for (const mod of modules) {
      if (mod.mounted) mod.dispose()
      scene.remove(mod.group)
    }
    renderer.dispose()
  }

  return { renderer, update, resize, dispose }
}
