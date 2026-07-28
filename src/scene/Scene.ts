import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  MathUtils,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
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
import { loadDimensionEnvironment, disposeDimensionEnvironment } from './cinematic/environment'
import { createCinematicPost, bloomForDimension, type CinematicPost } from './cinematic/post'
import { Cinema, CinemaExposure } from './cinematic/palette'

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
  { at: 0, position: new Vector3(0, 0.15, 3.4), lookAt: new Vector3(0, 0.05, 0) },
  { at: 1, position: new Vector3(0.15, 0.25, 4.0), lookAt: new Vector3(0, 0, 0) },
  { at: 2, position: new Vector3(1.35, 2.55, 3.5), lookAt: new Vector3(0, 0.1, 0) },
  // 3D — intimate grasp framing
  { at: 3, position: new Vector3(1.8, 1.35, 3.2), lookAt: new Vector3(0.2, 0.7, 0.1) },
  // 4D — pull back to see editor stage
  { at: 4, position: new Vector3(0.2, 0.85, 5.6), lookAt: new Vector3(0, 0.2, -0.2) },
  // 5D — alternate takes
  { at: 5, position: new Vector3(0.15, 0.9, 6.2), lookAt: new Vector3(0, 0.1, 0) },
  // 6D — warped clones
  { at: 6, position: new Vector3(0, 0.55, 6.8), lookAt: new Vector3(0, 0.1, -0.2) },
  // 7D — catalog density
  { at: 7, position: new Vector3(0.2, 0.35, 5.8), lookAt: new Vector3(0, 0, 0) },
  { at: 7.35, position: new Vector3(0.1, 0.25, 4.4), lookAt: new Vector3(0.15, 0.55, 0) },
]

const BG = new Color(Cinema.void)
const _bg = new Color()

const _camPos = new Vector3()
const _camLook = new Vector3()
const _lookSmooth = new Vector3(0, 0, 0)
const _homePos = new Vector3(1.8, 1.35, 3.2)
const _homeLook = new Vector3(0.2, 0.7, 0.1)
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
      // Unmount before catalog fully forms — overlapping giants read as multi-limb glitches
      return !coda && dimension > 5.55 && dimension < 6.9
    case 'Logical7D':
      return coda ? progress < 0.42 : dimension > 6.55
    default:
      return true
  }
}

export function createScene(canvas: HTMLCanvasElement, perf: PerfSettings): DimensionScene {
  const scene = new Scene()
  scene.background = BG.clone()
  scene.fog = new Fog(Cinema.void, 8, 22)

  const camera = new PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0.15, 3.4)

  const renderer = new WebGLRenderer({
    canvas,
    antialias: perf.tier === 'high',
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(perf.pixelRatio)
  renderer.setClearColor(BG, 1)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = CinemaExposure.base

  const ambient = new AmbientLight(Cinema.fillCool, 0.18)
  const key = new DirectionalLight(Cinema.keyWarm, 1.15)
  key.position.set(4.2, 6.5, 3.5)
  const fill = new DirectionalLight(Cinema.fillCool, 0.35)
  fill.position.set(-3.5, 1.5, -2.5)
  scene.add(ambient, key, fill)

  void loadDimensionEnvironment(renderer, scene)

  const modules: DimensionModule[] = [
    createPoint0D(perf),
    createLine1D(perf),
    createPlane2D(perf),
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

  const post: CinematicPost | null = createCinematicPost(renderer, scene, camera, perf)

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

    let deep = MathUtils.clamp((dimension - 3.2) / 3.5, 0, 1)
    if (state.section === 'coda') {
      deep *= 1 - MathUtils.smoothstep(progress, 0.1, 0.5)
    }
    _bg.copy(BG)
    scene.background = _bg
    renderer.setClearColor(_bg, 1)
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(_bg)
      scene.fog.near = MathUtils.lerp(9, 5.5, deep)
      scene.fog.far = MathUtils.lerp(24, 16, deep)
    }

    renderer.toneMappingExposure =
      CinemaExposure.base -
      deep * (CinemaExposure.base - CinemaExposure.deep) +
      Math.sin(time * 0.35) * CinemaExposure.pulseAmp * (1 - deep * 0.5)

    if (post) {
      post.setBloomStrength(bloomForDimension(dimension, perf.bloomStrength))
      post.render()
    } else {
      renderer.render(scene, camera)
    }
  }

  const resize = (w: number, h: number) => {
    camera.aspect = w / Math.max(h, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    post?.resize(w, h)
  }

  const dispose = () => {
    for (const mod of modules) {
      if (mod.mounted) mod.dispose()
      scene.remove(mod.group)
    }
    post?.dispose()
    disposeDimensionEnvironment(scene)
    renderer.dispose()
  }

  return { renderer, update, resize, dispose }
}
