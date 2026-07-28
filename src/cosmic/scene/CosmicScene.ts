/**
 * Cosmic Scale scene — canon: neal.fun /size-of-space/
 *
 * Neal pan model: camera X hard-locks to the focus every frame (zero lag).
 * Smoothness comes from continuous `scale`, never from camera easing.
 * Easing the camera toward a moving layout target is what caused the shake.
 */
import {
  AmbientLight,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  WebGLRenderer,
} from 'three'
import type { PerfSettings } from '../../utils/perf'
import type { CosmicObject } from '../content/catalog'
import type { ScaleState } from '../scale/logScaleEngine'

export type CosmicSceneApi = {
  resize: (w: number, h: number) => void
  update: (state: ScaleState, time: number, dt: number) => void
  dispose: () => void
  ready: Promise<CosmicObject[]>
}

type BodyEntry = {
  object: CosmicObject
  root: Group
  reflection: Group
  materials: Array<MeshStandardMaterial | MeshBasicMaterial>
  reflMaterials: Array<MeshStandardMaterial | MeshBasicMaterial>
  radius: number
  x: number
  kind: 'sphere' | 'disk' | 'card'
  /** Horizontal half-extent as a multiple of `radius` (rings / wide cards > 1) */
  clearance: number
}

/** Screen size of the focused body — constant; neighbors scale relative to this */
const FOCUS_R = 1.05
const PAD = 0.22
const SCALE_POWER = 1
const MIN_R = 0.012
const MAX_R = 24
const FLOOR_Y = 0
const CAM_DIST = 9.4
const CAM_FOV = 36
const RING_CLEARANCE = 2.35

export function createCosmicScene(
  canvas: HTMLCanvasElement,
  catalog: CosmicObject[],
  perf: PerfSettings,
): CosmicSceneApi {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(perf.pixelRatio, 2))
  renderer.setClearColor(0x000000, 1)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.sortObjects = true

  const scene = new Scene()
  scene.background = new Color(0x000000)

  const camera = new PerspectiveCamera(CAM_FOV, 1, 0.05, 800)
  camera.position.set(0, FOCUS_R * 0.9, CAM_DIST)
  camera.lookAt(0, FOCUS_R * 0.45, 0)

  const key = new DirectionalLight(0xffffff, 1.65)
  key.position.set(2.8, 5.5, 5)
  scene.add(key)
  scene.add(new AmbientLight(0xffffff, 0.32))

  const stage = createMirrorStage()
  scene.add(stage.root)

  const loader = new TextureLoader()
  const bodies: BodyEntry[] = []

  let resolveReady!: (loaded: CosmicObject[]) => void
  const ready = new Promise<CosmicObject[]>((r) => {
    resolveReady = r
  })

  /** Hard-lock camera — X and Z are pure functions of scale (no damp = no shake) */
  const lockCamera = (focusX: number, camZ: number) => {
    camera.position.set(focusX, FOCUS_R * 0.9, camZ)
    camera.lookAt(focusX, FOCUS_R * 0.45, 0)
    stage.root.position.x = focusX
  }

  const loadAll = async () => {
    const sorted = [...catalog].sort((a, b) => a.sizeMeters - b.sizeMeters)
    const loaded: CosmicObject[] = []

    for (const obj of sorted) {
      try {
        const entry = await createBody(obj, loader)
        bodies.push(entry)
        loaded.push(obj)
        scene.add(entry.root)
        scene.add(entry.reflection)
      } catch (err) {
        console.warn(`[cosmic] skip ${obj.id}:`, err)
      }
    }

    if (bodies.length === 0) {
      resolveReady([])
      return
    }

    const earthIdx = bodies.findIndex((b) => b.object.id === 'earth')
    const startIdx = earthIdx >= 0 ? earthIdx : Math.floor(bodies.length / 2)
    const focusX = layoutBodies(bodies, startIdx)
    applyVisibility(bodies, startIdx)
    lockCamera(focusX, CAM_DIST)

    resolveReady(loaded)
  }

  void loadAll()

  return {
    ready,
    resize: (w, h) => {
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    },
    update: (state, time, _dt) => {
      if (bodies.length === 0) {
        renderer.render(scene, camera)
        return
      }

      const focusX = layoutBodies(bodies, state.focusIndexSmooth)
      applyVisibility(bodies, state.focusIndexSmooth)
      // Exact lock every frame — pan + Neal zoom dolly are pure fns of scale
      lockCamera(focusX, nealDollyZ(bodies, state.focusIndexSmooth))

      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i]
        const dist = Math.abs(i - state.focusIndexSmooth)
        placeBody(body)

        if (!body.root.visible) continue

        if (body.kind === 'sphere') {
          body.root.rotation.y = time * (dist < 0.5 ? 0.12 : 0.04)
          body.reflection.rotation.y = body.root.rotation.y
        } else {
          const yaw = Math.atan2(focusX - body.x, camera.position.z)
          body.root.rotation.set(0, yaw, 0)
          body.reflection.rotation.set(0, yaw, 0)
        }

        const presence = MathUtils.clamp(1.2 - dist * 0.18, 0.35, 1)
        for (const mat of body.materials) {
          if (body.kind === 'sphere') {
            mat.transparent = false
            mat.opacity = 1
          } else {
            mat.transparent = true
            mat.opacity = presence
          }
        }
        const reflStrength = (dist < 0.55 ? 0.62 : 0.34) * presence
        for (const mat of body.reflMaterials) {
          mat.opacity = reflStrength
        }
      }

      const focusIdx = MathUtils.clamp(
        Math.round(state.focusIndexSmooth),
        0,
        bodies.length - 1,
      )
      const focusBody = bodies[focusIdx]
      for (const mat of focusBody.materials) {
        mat.opacity = 1
        mat.transparent = focusBody.kind !== 'sphere'
      }
      for (const mat of focusBody.reflMaterials) {
        mat.opacity = 0.62
      }

      renderer.render(scene, camera)
    },
    dispose: () => {
      for (const body of bodies) {
        disposeGroup(body.root, false)
        disposeGroup(body.reflection, true)
      }
      stage.dispose()
      renderer.dispose()
    },
  }
}

/**
 * Neal lineup: priors to the left + a peek of the next bodies on the right.
 */
function applyVisibility(bodies: BodyEntry[], focusSmooth: number) {
  for (let i = 0; i < bodies.length; i++) {
    const dist = i - focusSmooth
    const show = dist >= -12 && dist <= 2.4
    bodies[i].root.visible = show
    bodies[i].reflection.visible = show
  }
}

/** Black mirror stage — horizon hairline only, no grid (neal.fun) */
function createMirrorStage(): { root: Group; dispose: () => void } {
  const root = new Group()
  root.name = 'stage'

  const floor = new Mesh(
    new PlaneGeometry(800, 120),
    new MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, FLOOR_Y, -10)
  root.add(floor)

  const horizon = new Mesh(
    new PlaneGeometry(800, 0.012),
    new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  )
  horizon.rotation.x = -Math.PI / 2
  horizon.position.set(0, FLOOR_Y + 0.002, 0)
  root.add(horizon)

  return {
    root,
    dispose: () => {
      root.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose()
          ;(child.material as MeshBasicMaterial).dispose()
        }
      })
    },
  }
}

/**
 * Lay out the shelf for the current scale and return the focus X.
 * Camera must hard-lock to this value — do not ease toward it.
 * Focus size interpolates in log-space (Neal-even zoom across size jumps).
 */
function layoutBodies(bodies: BodyEntry[], focusSmooth: number): number {
  const i0 = Math.floor(focusSmooth)
  const i1 = Math.min(bodies.length - 1, Math.max(0, i0 + 1))
  const frac = MathUtils.clamp(focusSmooth - i0, 0, 1)
  const s0 = bodies[MathUtils.clamp(i0, 0, bodies.length - 1)].object.sizeMeters
  const s1 = bodies[i1].object.sizeMeters
  // Log lerp — linear meter lerp spends the whole pan near the larger body
  const focusSize = Math.exp(
    MathUtils.lerp(Math.log(Math.max(s0, 1e-30)), Math.log(Math.max(s1, 1e-30)), frac),
  )

  for (let i = 0; i < bodies.length; i++) {
    const ratio = bodies[i].object.sizeMeters / Math.max(focusSize, 1e-30)
    bodies[i].radius = MathUtils.clamp(
      FOCUS_R * Math.pow(ratio, SCALE_POWER),
      MIN_R,
      MAX_R,
    )
  }

  let x = 0
  bodies[0].x = 0
  for (let i = 1; i < bodies.length; i++) {
    const prev = bodies[i - 1]
    const curr = bodies[i]
    x += prev.radius * prev.clearance + curr.radius * curr.clearance + PAD * FOCUS_R
    curr.x = x
  }

  return MathUtils.lerp(bodies[i0].x, bodies[i1].x, frac)
}

/**
 * Neal mid-transition dolly: pull back when zooming out to something larger,
 * ease in when zooming in — pure function of scale, zero lag.
 */
function nealDollyZ(bodies: BodyEntry[], focusSmooth: number): number {
  const i0 = Math.floor(focusSmooth)
  const i1 = Math.min(bodies.length - 1, Math.max(0, i0 + 1))
  const frac = focusSmooth - i0
  if (i0 === i1 || frac < 1e-4 || frac > 1 - 1e-4) return CAM_DIST

  const s0 = Math.max(bodies[i0].object.sizeMeters, 1e-30)
  const s1 = Math.max(bodies[i1].object.sizeMeters, 1e-30)
  const logJump = Math.log(s1 / s0)
  const amp = Math.min(0.9, Math.abs(logJump) * 0.16)
  const envelope = Math.sin(Math.PI * frac)
  return CAM_DIST * (1 + Math.sign(logJump || 1) * amp * envelope)
}
function placeBody(body: BodyEntry) {
  const r = body.radius
  body.root.position.set(body.x, FLOOR_Y + r, 0)
  body.root.scale.setScalar(r)
  body.root.renderOrder = 2

  body.reflection.position.set(body.x, FLOOR_Y - r, 0)
  body.reflection.scale.set(r, -r, r)
  body.reflection.renderOrder = -1
}

async function createBody(obj: CosmicObject, loader: TextureLoader): Promise<BodyEntry> {
  const root = new Group()
  root.name = obj.id
  const materials: Array<MeshStandardMaterial | MeshBasicMaterial> = []
  const tex = await loadTexture(loader, `/cosmic/${obj.src}`)

  const kind = resolveKind(obj)
  let clearance = 1

  if (kind === 'sphere') {
    const mat = new MeshStandardMaterial({
      map: tex,
      roughness: obj.id === 'sun' ? 0.4 : 0.78,
      metalness: 0.02,
      emissiveMap: obj.id === 'sun' ? tex : null,
      emissive: obj.id === 'sun' ? 0x331800 : 0x000000,
      emissiveIntensity: obj.id === 'sun' ? 0.4 : 0,
    })
    materials.push(mat)
    root.add(new Mesh(new SphereGeometry(1, 64, 48), mat))

    if (obj.ringSrc) {
      const ringTex = await loadTexture(loader, `/cosmic/${obj.ringSrc}`)
      const ringMat = new MeshBasicMaterial({
        map: ringTex,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
      })
      materials.push(ringMat)
      const ring = new Mesh(new RingGeometry(1.25, 2.05, 72), ringMat)
      ring.rotation.x = Math.PI / 2.3
      root.add(ring)
      clearance = RING_CLEARANCE
    }
  } else if (kind === 'disk') {
    const mat = new MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
    })
    materials.push(mat)
    root.add(new Mesh(new CircleGeometry(1, 64), mat))
  } else {
    const aspect = tex.image
      ? (tex.image as HTMLImageElement).width / Math.max(1, (tex.image as HTMLImageElement).height)
      : 1
    const h = 2
    const w = h * MathUtils.clamp(aspect, 0.7, 1.6)
    const mat = new MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
    })
    materials.push(mat)
    root.add(new Mesh(new PlaneGeometry(w, h), mat))
    clearance = Math.max(1, w / 2)
  }

  const reflection = root.clone(true)
  const reflMaterials: Array<MeshStandardMaterial | MeshBasicMaterial> = []
  reflection.traverse((child) => {
    if (child instanceof Mesh) {
      const src = child.material as MeshStandardMaterial | MeshBasicMaterial
      const m = src.clone()
      m.transparent = true
      m.opacity = 0.55
      m.depthWrite = false
      m.side = DoubleSide
      if ('roughness' in m) {
        ;(m as MeshStandardMaterial).roughness = 1
        ;(m as MeshStandardMaterial).metalness = 0
        ;(m as MeshStandardMaterial).emissiveIntensity = 0
      }
      injectGlassFade(m)
      child.material = m
      child.renderOrder = -1
      reflMaterials.push(m)
    }
  })

  return {
    object: obj,
    root,
    reflection,
    materials,
    reflMaterials,
    radius: FOCUS_R,
    x: 0,
    kind,
    clearance,
  }
}

function injectGlassFade(mat: MeshStandardMaterial | MeshBasicMaterial) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vGlassY;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         vGlassY = (modelMatrix * vec4(transformed, 1.0)).y;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vGlassY;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
         float glassFade = smoothstep(-3.4, -0.02, vGlassY);
         gl_FragColor.a *= glassFade;
         gl_FragColor.rgb *= mix(vec3(0.0), gl_FragColor.rgb, 0.75 + 0.25 * glassFade);`,
      )
  }
  mat.needsUpdate = true
}

function resolveKind(obj: CosmicObject): 'sphere' | 'disk' | 'card' {
  if (obj.type === 'textureSphere') return 'sphere'
  const diskIds = new Set([
    'europa',
    'io',
    'titan',
    'pluto',
    'earth_apollo',
    'jupiter_juno',
    'mars_curiosity',
  ])
  if (diskIds.has(obj.id)) return 'disk'
  return 'card'
}

function disposeGroup(root: Group, skipMaps: boolean) {
  root.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry.dispose()
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      for (const m of mats) {
        const std = m as MeshStandardMaterial
        if (!skipMaps && std.map) std.map.dispose()
        std.dispose()
      }
    }
  })
}

function loadTexture(loader: TextureLoader, url: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = SRGBColorSpace
        tex.anisotropy = 8
        resolve(tex)
      },
      undefined,
      () => reject(new Error(`Failed to load ${url}`)),
    )
  })
}
