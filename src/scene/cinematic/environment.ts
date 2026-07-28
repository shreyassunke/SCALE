import {
  DataTexture,
  EquirectangularReflectionMapping,
  PMREMGenerator,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
  Scene,
} from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

const HDRI_URL = '/dimensions/hdri/dikhololo_night_1k.hdr'

let cachedEnv: Texture | null = null
let loadPromise: Promise<Texture> | null = null

/**
 * Load Poly Haven night HDRI once, bake PMREM for scene.environment.
 * Background stays absolute black — env is for reflections only.
 */
export async function loadDimensionEnvironment(
  renderer: WebGLRenderer,
  scene: Scene,
): Promise<Texture | null> {
  if (cachedEnv) {
    scene.environment = cachedEnv
    return cachedEnv
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const loader = new RGBELoader()
      loader.load(
        HDRI_URL,
        (hdr) => {
          hdr.mapping = EquirectangularReflectionMapping
          const pmrem = new PMREMGenerator(renderer)
          pmrem.compileEquirectangularShader()
          const env = pmrem.fromEquirectangular(hdr).texture
          hdr.dispose()
          pmrem.dispose()
          cachedEnv = env
          resolve(env)
        },
        undefined,
        (err) => {
          console.warn('[dimensions] HDRI failed to load', err)
          loadPromise = null
          reject(err)
        },
      )
    })
  }
  try {
    const env = await loadPromise
    scene.environment = env
    scene.environmentIntensity = 0.55
    return env
  } catch {
    return null
  }
}

export function disposeDimensionEnvironment(scene: Scene) {
  if (scene.environment) {
    scene.environment = null
  }
  if (cachedEnv) {
    cachedEnv.dispose()
    cachedEnv = null
  }
  loadPromise = null
}

/** Tiny fallback so materials still light if HDRI is missing */
export function makeFallbackEnvTexture(): DataTexture {
  const data = new Uint8Array([24, 28, 36, 255])
  const tex = new DataTexture(data, 1, 1)
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}
