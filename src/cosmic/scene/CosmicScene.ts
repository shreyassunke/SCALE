import {
  AmbientLight,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  LinearFilter,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
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
}

const FOCUS_R = 1.55
const GAP = 0.85
const FLOOR_Y = 0
const CAM_DIST = 7.2

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

  // High enough to read the perspective grid stage
  const camera = new PerspectiveCamera(36, 1, 0.05, 800)
  camera.position.set(0, 1.85, CAM_DIST)

  const key = new DirectionalLight(0xffffff, 1.55)
  key.position.set(3.5, 5, 6)
  scene.add(key)
  scene.add(new AmbientLight(0xffffff, 0.28))

  const stage = createStage()
  scene.add(stage.root)

  const loader = new TextureLoader()
  const bodies: BodyEntry[] = []

  let resolveReady!: (loaded: CosmicObject[]) => void
  const ready = new Promise<CosmicObject[]>((r) => {
    resolveReady = r
  })

  let camX = 0

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
    layoutBodies(bodies, startIdx, 1)
    camX = bodies[startIdx].x
    camera.position.x = camX
    stage.root.position.x = camX

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
    update: (state, time, dt) => {
      if (bodies.length === 0) {
        renderer.render(scene, camera)
        return
      }

      const focusIdx = MathUtils.clamp(
        Math.round(state.focusIndexSmooth),
        0,
        bodies.length - 1,
      )

      layoutBodies(bodies, state.focusIndexSmooth, Math.min(1, 14 * dt))

      const i0 = Math.floor(state.focusIndexSmooth)
      const i1 = Math.min(bodies.length - 1, i0 + 1)
      const frac = state.focusIndexSmooth - i0
      const targetX = MathUtils.lerp(bodies[i0].x, bodies[i1].x, frac)
      const focusR = MathUtils.lerp(bodies[i0].radius, bodies[i1].radius, frac)

      const ease = 1 - Math.exp(-11 * dt)
      camX += (targetX - camX) * ease

      // Stage tracks the camera so the grid always fills the shelf
      stage.root.position.x += (camX - stage.root.position.x) * ease

      const targetZ = CAM_DIST * (FOCUS_R / Math.max(focusR, 0.35))
      camera.position.x = camX
      camera.position.y = 1.65 + focusR * 0.12
      camera.position.z += (MathUtils.clamp(targetZ, 5.5, 14) - camera.position.z) * ease
      camera.lookAt(camX, focusR * 0.35, 0)

      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i]
        const dist = Math.abs(i - state.focusIndexSmooth)
        placeBody(body)

        if (body.kind === 'sphere') {
          body.root.rotation.y = time * (dist < 0.5 ? 0.1 : 0.035)
          body.reflection.rotation.y = body.root.rotation.y
        } else {
          const yaw = Math.atan2(camera.position.x - body.x, camera.position.z)
          body.root.rotation.set(0, yaw, 0)
          body.reflection.rotation.set(0, yaw, 0)
        }

        const presence = MathUtils.clamp(1.15 - dist * 0.22, 0.4, 1)
        for (const mat of body.materials) {
          if (body.kind === 'sphere') {
            mat.transparent = false
            mat.opacity = 1
          } else {
            mat.transparent = true
            mat.opacity = presence
          }
        }
        // Glass reflection strength — stronger near focus, fades with distance
        const reflStrength = (dist < 0.55 ? 0.55 : 0.32) * presence
        for (const mat of body.reflMaterials) {
          mat.opacity = reflStrength
        }
      }

      const focusBody = bodies[focusIdx]
      for (const mat of focusBody.materials) {
        mat.opacity = 1
        mat.transparent = focusBody.kind !== 'sphere'
      }
      for (const mat of focusBody.reflMaterials) {
        mat.opacity = 0.58
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

/** Minimal B&W perspective grid — the stage objects rest on */
function createStage(): { root: Group; dispose: () => void } {
  const root = new Group()
  root.name = 'stage'

  const gridTex = createGridTexture()
  gridTex.wrapS = RepeatWrapping
  gridTex.wrapT = RepeatWrapping
  // Long runway into depth; wide enough for the lineup
  gridTex.repeat.set(48, 18)

  const gridMat = new MeshBasicMaterial({
    map: gridTex,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: DoubleSide,
  })

  const grid = new Mesh(new PlaneGeometry(220, 90), gridMat)
  grid.rotation.x = -Math.PI / 2
  grid.position.set(0, FLOOR_Y + 0.001, -8)
  grid.renderOrder = 0
  root.add(grid)

  // Soft horizon fade so the grid dissolves into the void
  const fade = new Mesh(
    new PlaneGeometry(220, 90),
    new MeshBasicMaterial({
      map: createFloorFadeTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 1,
      side: DoubleSide,
    }),
  )
  fade.rotation.x = -Math.PI / 2
  fade.position.set(0, FLOOR_Y + 0.002, -8)
  fade.renderOrder = 1
  root.add(fade)

  // Hairline horizon where stage meets void
  const horizon = new Mesh(
    new PlaneGeometry(220, 0.015),
    new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  )
  horizon.position.set(0, FLOOR_Y + 0.003, 12)
  root.add(horizon)

  return {
    root,
    dispose: () => {
      grid.geometry.dispose()
      gridMat.dispose()
      gridTex.dispose()
      fade.geometry.dispose()
      ;(fade.material as MeshBasicMaterial).map?.dispose()
      ;(fade.material as MeshBasicMaterial).dispose()
      horizon.geometry.dispose()
      ;(horizon.material as MeshBasicMaterial).dispose()
    },
  }
}

function createGridTexture(): CanvasTexture {
  const size = 512
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, size, size)

  const cells = 8
  const step = size / cells

  // Minor lines
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 1
  for (let i = 0; i <= cells; i++) {
    const p = i * step + 0.5
    ctx.beginPath()
    ctx.moveTo(p, 0)
    ctx.lineTo(p, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, p)
    ctx.lineTo(size, p)
    ctx.stroke()
  }

  // Major lines
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.25
  for (let i = 0; i <= cells; i += 2) {
    const p = i * step + 0.5
    ctx.beginPath()
    ctx.moveTo(p, 0)
    ctx.lineTo(p, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, p)
    ctx.lineTo(size, p)
    ctx.stroke()
  }

  const tex = new CanvasTexture(c)
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.needsUpdate = true
  return tex
}

/** Darkens the far/near edges of the stage so the grid feels finite */
function createFloorFadeTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, 'rgba(0,0,0,0.92)')
  g.addColorStop(0.22, 'rgba(0,0,0,0.15)')
  g.addColorStop(0.55, 'rgba(0,0,0,0)')
  g.addColorStop(0.82, 'rgba(0,0,0,0.25)')
  g.addColorStop(1, 'rgba(0,0,0,0.95)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 256)
  const tex = new CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

function layoutBodies(bodies: BodyEntry[], focusSmooth: number, blend: number) {
  const i0 = Math.floor(focusSmooth)
  const i1 = Math.min(bodies.length - 1, Math.max(0, i0 + 1))
  const frac = focusSmooth - Math.floor(focusSmooth)
  const focusSize = MathUtils.lerp(
    bodies[MathUtils.clamp(i0, 0, bodies.length - 1)].object.sizeMeters,
    bodies[i1].object.sizeMeters,
    MathUtils.clamp(frac, 0, 1),
  )

  const targetRadii = bodies.map((b) => {
    const ratio = b.object.sizeMeters / Math.max(focusSize, 1e-30)
    const r = FOCUS_R * Math.pow(ratio, 0.42)
    return MathUtils.clamp(r, 0.06, 14)
  })

  for (let i = 0; i < bodies.length; i++) {
    bodies[i].radius += (targetRadii[i] - bodies[i].radius) * blend
  }

  let x = 0
  bodies[0].x = 0
  for (let i = 1; i < bodies.length; i++) {
    x += bodies[i - 1].radius + bodies[i].radius + GAP
    bodies[i].x = x
  }
}

function placeBody(body: BodyEntry) {
  const r = body.radius
  body.root.position.set(body.x, FLOOR_Y + r, 0)
  body.root.scale.setScalar(r)
  body.root.renderOrder = 2

  // Glass mirror — flipped under the stage plane (must stay visible: grid is transparent)
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
    const plane = new Mesh(new PlaneGeometry(w, h), mat)
    root.add(plane)
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
  }
}

/** Fade reflection by world height — bright at the stage, dissolving into the void */
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
