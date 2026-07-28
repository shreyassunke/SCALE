import {
  Vector2,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import type { PerfSettings } from '../../utils/perf'

export type CinematicPost = {
  render: () => void
  resize: (w: number, h: number) => void
  setBloomStrength: (v: number) => void
  dispose: () => void
}

/**
 * Subtle bloom for high tier. Tone mapping stays on the renderer (ACES).
 */
export function createCinematicPost(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  perf: PerfSettings,
): CinematicPost | null {
  if (!perf.enablePost) return null

  const size = new Vector2()
  renderer.getSize(size)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new UnrealBloomPass(
    new Vector2(Math.max(1, size.x), Math.max(1, size.y)),
    perf.bloomStrength,
    0.55,
    0.82,
  )
  composer.addPass(bloom)

  return {
    render: () => composer.render(),
    resize: (w, h) => {
      composer.setSize(w, h)
      bloom.resolution.set(w, h)
    },
    setBloomStrength: (v) => {
      bloom.strength = v
    },
    dispose: () => {
      composer.dispose()
    },
  }
}

/** Soften bloom as dimension deepens so late beats stay quiet */
export function bloomForDimension(dimension: number, base: number): number {
  const deep = Math.min(1, Math.max(0, (dimension - 3) / 4))
  return base * (1 - deep * 0.35)
}
