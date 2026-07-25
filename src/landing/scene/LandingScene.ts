import {
  Color,
  FogExp2,
  Group,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import {
  CLOUD_URL,
  Cloud,
  Clouds,
  Grid,
  Sparkles,
  Stars,
} from '@pmndrs/vanilla'
import type { PerfSettings } from '../../utils/perf'

export type LandingScene = {
  setActiveTrack: (track: number | null) => void
  update: (time: number, pointer: { x: number; y: number }) => void
  resize: (w: number, h: number) => void
  dispose: () => void
}

const VOID = new Color('#000000')
const SIGNAL = new Color('#ffffff')
const FAINT = new Color('#3a3a3a')
const DIM = new Color('#6e6e6e')

export function createLandingScene(
  canvas: HTMLCanvasElement,
  perf: PerfSettings,
): LandingScene {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const useBloom = perf.enableSoftGlow && !reduceMotion
  const high = perf.tier === 'high'

  const renderer = new WebGLRenderer({
    canvas,
    antialias: high,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(VOID, 1)
  renderer.setPixelRatio(perf.pixelRatio)

  const scene = new Scene()
  scene.fog = new FogExp2(0x000000, 0.018)
  scene.background = VOID

  const camera = new PerspectiveCamera(48, 1, 0.1, 400)
  camera.position.set(0, 1.4, 9.5)

  const root = new Group()
  scene.add(root)

  // @pmndrs/vanilla — deep starfield
  const starCount = reduceMotion ? 1200 : high ? 5500 : 2200
  const stars = new Stars({
    radius: 120,
    depth: 60,
    count: starCount,
    factor: high ? 3.2 : 2.6,
    saturation: 0,
    fade: true,
    speed: reduceMotion ? 0.15 : 0.45,
  })
  root.add(stars)

  // @pmndrs/vanilla — floating dust / point cloud
  const sparkleCount = reduceMotion
    ? 40
    : high
      ? Math.min(perf.dustCount * 2, 280)
      : 90
  const sparkles = new Sparkles({
    count: sparkleCount,
    scale: [14, 8, 12],
    size: high ? 2.4 : 3.2,
    speed: reduceMotion ? 0.08 : 0.28,
    opacity: 0.55,
    color: SIGNAL,
    noise: 1.2,
  })
  sparkles.setPixelRatio(perf.pixelRatio)
  sparkles.position.set(0, 0.6, -1)
  root.add(sparkles)

  // @pmndrs/vanilla — faint perspective floor (cosmic mesh tunnel ref)
  const grid = Grid({
    args: [24, 24],
    cellSize: 0.55,
    cellThickness: 0.45,
    cellColor: FAINT,
    sectionSize: 2.75,
    sectionThickness: 0.9,
    sectionColor: DIM,
    fadeDistance: high ? 28 : 18,
    fadeStrength: 1.35,
    followCamera: false,
    infiniteGrid: true,
  })
  grid.mesh.position.y = -2.2
  grid.mesh.rotation.x = 0
  root.add(grid.mesh)

  // @pmndrs/vanilla — soft volumetric haze (async texture)
  let clouds: Clouds | null = null
  let cloudA: Cloud | null = null
  let cloudB: Cloud | null = null
  let disposed = false
  const textureLoader = new TextureLoader()

  textureLoader.load(
    CLOUD_URL,
    (texture) => {
      if (disposed) {
        texture.dispose()
        return
      }
      clouds = new Clouds({
        texture,
        limit: high ? 80 : 40,
        material: MeshBasicMaterial,
        frustumCulled: true,
      })
      clouds.position.set(0, 1.2, -4)

      cloudA = new Cloud({
        seed: 2.1,
        segments: high ? 18 : 10,
        bounds: new Vector3(8, 1.6, 2.2),
        volume: 4.5,
        opacity: 0.12,
        fade: 18,
        speed: reduceMotion ? 0 : 0.08,
        growth: 2,
        color: SIGNAL,
        concentrate: 'inside',
      })
      cloudB = new Cloud({
        seed: 7.4,
        segments: high ? 14 : 8,
        bounds: new Vector3(6, 1.2, 1.8),
        volume: 3.2,
        opacity: 0.08,
        fade: 16,
        speed: reduceMotion ? 0 : 0.05,
        growth: 1.5,
        color: DIM,
        concentrate: 'outside',
      })
      cloudB.position.set(1.5, -0.4, 2)

      clouds.add(cloudA)
      clouds.add(cloudB)
      root.add(clouds)
    },
    undefined,
    () => {
      // Texture unavailable — stars/sparkles/grid still carry the hero
    },
  )

  // Soft cinematic bloom (three/addons)
  const composer = useBloom ? new EffectComposer(renderer) : null
  let bloomPass: UnrealBloomPass | null = null
  if (composer) {
    composer.addPass(new RenderPass(scene, camera))
    bloomPass = new UnrealBloomPass(new Vector2(1, 1), 0.35, 0.55, 0.82)
    composer.addPass(bloomPass)
  }

  let activeTrack: number | null = null
  let lastTime = 0
  const look = new Vector3(0, 0.2, 0)
  const baseSparkleScale = 1

  const setActiveTrack = (track: number | null) => {
    activeTrack = track
    if (track === null) {
      sparkles.scale.setScalar(baseSparkleScale)
      stars.speed = reduceMotion ? 0.15 : 0.45
    } else {
      sparkles.scale.setScalar(1.12)
      stars.speed = reduceMotion ? 0.2 : 0.75
    }
  }

  setActiveTrack(null)

  const update = (time: number, pointer: { x: number; y: number }) => {
    const delta = Math.min(Math.max(time - lastTime, 0), 0.05)
    lastTime = time

    const drift = reduceMotion ? 0 : time * 0.012
    root.rotation.y = drift + pointer.x * 0.08
    root.rotation.x = pointer.y * 0.04

    camera.position.x = pointer.x * 0.55
    camera.position.y = 1.4 + pointer.y * 0.35
    camera.position.z = 9.5 + (activeTrack !== null ? -0.35 : 0)
    look.set(pointer.x * -0.25, 0.15 + pointer.y * -0.12, 0)
    camera.lookAt(look)

    stars.update(time)
    sparkles.update(time)
    grid.update(camera)

    if (clouds) {
      clouds.update(camera, time, delta)
      if (activeTrack !== null && cloudA) {
        cloudA.opacity = 0.16
        cloudA.updateCloud()
      } else if (cloudA) {
        cloudA.opacity = 0.12
        cloudA.updateCloud()
      }
    }

    if (composer && bloomPass) {
      bloomPass.strength = activeTrack !== null ? 0.48 : 0.32
      composer.render()
    } else {
      renderer.render(scene, camera)
    }
  }

  const resize = (w: number, h: number) => {
    camera.aspect = w / Math.max(h, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    if (composer) {
      composer.setSize(w, h)
      composer.setPixelRatio(perf.pixelRatio)
    }
    if (bloomPass) {
      bloomPass.resolution.set(w, h)
    }
  }

  const dispose = () => {
    disposed = true
    stars.geometry.dispose()
    ;(stars.material as { dispose: () => void }).dispose()
    sparkles.geometry.dispose()
    ;(sparkles.material as { dispose: () => void }).dispose()
    grid.mesh.geometry.dispose()
    ;(grid.mesh.material as { dispose: () => void }).dispose()
    if (clouds) {
      clouds.instance.geometry.dispose()
      const cloudMat = clouds.cloudMaterial as MeshBasicMaterial
      cloudMat.map?.dispose()
      cloudMat.dispose()
    }
    composer?.dispose()
    bloomPass?.dispose()
    renderer.dispose()
  }

  return { setActiveTrack, update, resize, dispose }
}
