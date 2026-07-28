import {
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type Material,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import type { PerfSettings } from '../../utils/perf'

const textureLoader = new TextureLoader()
const gltfLoader = new GLTFLoader()

const textureCache = new Map<string, Promise<Texture>>()
const gltfFullCache = new Map<
  string,
  Promise<{ scene: Group; animations: import('three').AnimationClip[] }>
>()

function loadTexture(url: string, colorSpace?: typeof SRGBColorSpace): Promise<Texture> {
  const key = `${url}|${colorSpace ?? 'linear'}`
  let p = textureCache.get(key)
  if (!p) {
    p = new Promise((resolve, reject) => {
      textureLoader.load(
        url,
        (tex) => {
          if (colorSpace) tex.colorSpace = colorSpace
          tex.wrapS = RepeatWrapping
          tex.wrapT = RepeatWrapping
          resolve(tex)
        },
        undefined,
        reject,
      )
    })
    textureCache.set(key, p)
  }
  return p
}

export type PbrMaps = {
  map?: Texture
  normalMap?: Texture
  roughnessMap?: Texture
  metalnessMap?: Texture
}

export async function loadPbrSet(
  folder: 'metal' | 'paper' | 'plaster',
  perf: PerfSettings,
): Promise<PbrMaps> {
  const base = `/dimensions/textures/${folder}`
  const anisotropic = perf.maxAnisotropy
  const color = await loadTexture(`${base}/Color.jpg`, SRGBColorSpace)
  color.anisotropy = anisotropic

  const maps: PbrMaps = { map: color }

  try {
    const normal = await loadTexture(`${base}/Normal.jpg`)
    normal.anisotropy = anisotropic
    maps.normalMap = normal
  } catch {
    /* optional */
  }

  try {
    const rough = await loadTexture(`${base}/Roughness.jpg`)
    rough.anisotropy = anisotropic
    maps.roughnessMap = rough
  } catch {
    /* optional */
  }

  if (folder === 'metal') {
    try {
      const metal = await loadTexture(`${base}/Metalness.jpg`)
      metal.anisotropy = anisotropic
      maps.metalnessMap = metal
    } catch {
      /* optional */
    }
  }

  return maps
}

export function applyPbrMaps(mat: MeshStandardMaterial, maps: PbrMaps, repeat = 1) {
  if (maps.map) {
    maps.map.repeat.set(repeat, repeat)
    mat.map = maps.map
  }
  if (maps.normalMap) {
    maps.normalMap.repeat.set(repeat, repeat)
    mat.normalMap = maps.normalMap
  }
  if (maps.roughnessMap) {
    maps.roughnessMap.repeat.set(repeat, repeat)
    mat.roughnessMap = maps.roughnessMap
  }
  if (maps.metalnessMap) {
    maps.metalnessMap.repeat.set(repeat, repeat)
    mat.metalnessMap = maps.metalnessMap
  }
  mat.needsUpdate = true
}

/** Load a GLB and return a cloned Group ready for the scene */
export async function loadGlb(url: string): Promise<Group> {
  const { scene } = await loadGltf(url)
  return scene
}

export type LoadedGltf = {
  scene: Group
  animations: import('three').AnimationClip[]
}

/** Load glTF once; clones scene per call so instances don't share graph */
export async function loadGltf(url: string): Promise<LoadedGltf> {
  let p = gltfFullCache.get(url)
  if (!p) {
    p = new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) =>
          resolve({
            scene: gltf.scene,
            animations: gltf.animations ?? [],
          }),
        undefined,
        reject,
      )
    })
    gltfFullCache.set(url, p)
  }
  const { scene, animations } = await p
  // Skinned meshes must use SkeletonUtils.clone — Object3D.clone breaks bone→skin binding
  // (character stays stuck in bind/A-pose while "animated" nodes move invisibly).
  const hasSkin = (() => {
    let found = false
    scene.traverse((o) => {
      const m = o as Mesh & { isSkinnedMesh?: boolean }
      if (m.isSkinnedMesh) found = true
    })
    return found
  })()
  return {
    scene: (hasSkin ? cloneSkinned(scene) : scene.clone(true)) as Group,
    animations,
  }
}

export function setGroupOpacity(root: Object3D, opacity: number) {
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      const mat = m as Material & {
        transparent?: boolean
        opacity?: number
        depthWrite?: boolean
      }
      if (typeof mat.opacity === 'number') {
        mat.transparent = opacity < 0.98
        mat.opacity = opacity
        mat.depthWrite = opacity > 0.85
        mat.needsUpdate = true
      }
    }
  })
}

export function disposeObject3D(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) m.dispose()
    }
  })
}

export const DimensionAssets = {
  orb: '/dimensions/models/ceramic_vase_01/ceramic_vase_01_1k.gltf',
  candle: '/dimensions/models/brass_candleholders/brass_candleholders_1k.gltf',
  desk: '/dimensions/models/school_desk/SchoolDesk_01_1k.gltf',
  /** Poly Haven photoscanned cardboard box — continuity prop 3D→7D */
  box: '/dimensions/models/cardboard_box_01/cardboard_box_01_1k.gltf',
  /**
   * Optional drop-in: Blender-exported Renderpeople (or scanned) man + pickup anim.
   * When present, continuityHero can prefer this over the articulated stand-in.
   */
  continuityMan: '/dimensions/models/continuity_hero/man.glb',
  continuityHero: '/dimensions/models/continuity_hero/continuity_hero.glb',
} as const
