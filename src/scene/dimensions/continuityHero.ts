import {
  Box3,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Euler,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Bone,
} from 'three'
import type { PerfSettings } from '../../utils/perf'
import {
  DimensionAssets,
  disposeObject3D,
  loadGlb,
  loadGltf,
  setGroupOpacity,
} from '../cinematic/loaders'

const SKIN = 0xc4a484
const CLOTH = 0x2a2e36
const HAIR = 0x1a1816

export type PickupOutcome = 'lift' | 'leave' | 'drop' | 'never'

export type ContinuityHero = {
  root: Group
  box: Object3D
  man: Group
  ready: Promise<void>
  /** Pose pickup 0→1. Optional `life`/`phase` add breath + micro-sway. */
  scrubPickup: (t: number, life?: number, phase?: number) => void
  setOutcome: (outcome: PickupOutcome, t?: number, life?: number, phase?: number) => void
  setOpacity: (opacity: number) => void
  setPhysicsWarp: (
    mode: 'normal' | 'float' | 'sink' | 'crush' | 'drift',
    amount: number,
  ) => void
  cloneInstance: () => Group
  dispose: () => void
}

type LimbRefs = {
  shoulder: Group
  elbow: Group
  wrist: Group
  hand: Group
}

type BonePose = { bone: Object3D; rest: Quaternion }

function limbMat(color: number, rough = 0.55): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color(color),
    roughness: rough,
    metalness: 0.02,
    clearcoat: 0.12,
    clearcoatRoughness: 0.55,
    sheen: 0.35,
    sheenRoughness: 0.7,
    sheenColor: new Color(color),
    transparent: true,
    opacity: 1,
  })
}

function clothMat(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(CLOTH),
    roughness: 0.82,
    metalness: 0.04,
    transparent: true,
    opacity: 1,
  })
}

function makeCapsule(
  radius: number,
  length: number,
  mat: MeshStandardMaterial | MeshPhysicalMaterial,
  segs: number,
): Mesh {
  return new Mesh(new CapsuleGeometry(radius, Math.max(0.01, length), segs, segs * 2), mat)
}

function buildArticulatedMan(perf: PerfSettings): {
  man: Group
  right: LimbRefs
  left: LimbRefs
  legs: { rHip: Group; rKnee: Group; lHip: Group; lKnee: Group; hips: Group; torso: Group }
} {
  const segs = perf.tier === 'high' ? 12 : 8
  const skin = limbMat(SKIN, 0.52)
  const cloth = clothMat()
  const hair = limbMat(HAIR, 0.75)

  const man = new Group()
  man.name = 'ContinuityManFallback'

  const hips = new Group()
  hips.position.y = 0.92
  const pelvis = makeCapsule(0.14, 0.12, cloth, segs)
  pelvis.rotation.z = Math.PI / 2
  hips.add(pelvis)

  const torso = new Group()
  torso.position.y = 0.22
  torso.add(makeCapsule(0.16, 0.38, cloth, segs))

  const neck = makeCapsule(0.05, 0.08, skin, segs)
  neck.position.y = 0.32
  torso.add(neck)

  const head = new Mesh(new SphereGeometry(0.11, segs * 2, segs * 2), skin)
  head.position.y = 0.44
  head.scale.set(1, 1.15, 0.95)
  const hairCap = new Mesh(new SphereGeometry(0.112, segs * 2, segs), hair)
  hairCap.position.y = 0.06
  hairCap.scale.set(1.02, 0.7, 1.05)
  head.add(hairCap)
  torso.add(head)

  const makeArm = (side: 1 | -1): LimbRefs => {
    const shoulder = new Group()
    shoulder.position.set(side * 0.22, 0.28, 0)
    const upper = new Group()
    const upperMesh = makeCapsule(0.045, 0.28, skin, segs)
    upperMesh.position.y = -0.16
    upper.add(upperMesh)

    const elbow = new Group()
    elbow.position.y = -0.32
    const forearm = new Group()
    const foreMesh = makeCapsule(0.038, 0.26, skin, segs)
    foreMesh.position.y = -0.15
    forearm.add(foreMesh)

    const wrist = new Group()
    wrist.position.y = -0.3
    const hand = new Group()
    const palm = makeCapsule(0.04, 0.08, skin, segs)
    palm.position.y = -0.05
    palm.scale.set(1.15, 1, 0.7)
    hand.add(palm)
    for (let f = 0; f < 4; f++) {
      const finger = makeCapsule(0.01, 0.06, skin, 6)
      finger.position.set((f - 1.5) * 0.022, -0.12, 0.01)
      hand.add(finger)
    }
    const thumb = makeCapsule(0.012, 0.045, skin, 6)
    thumb.position.set(side * 0.045, -0.06, 0.03)
    thumb.rotation.z = side * 0.6
    hand.add(thumb)

    wrist.add(hand)
    forearm.add(wrist)
    elbow.add(forearm)
    upper.add(elbow)
    shoulder.add(upper)
    torso.add(shoulder)
    return { shoulder, elbow, wrist, hand }
  }

  const right = makeArm(1)
  const left = makeArm(-1)

  const makeLeg = (side: 1 | -1) => {
    const hip = new Group()
    hip.position.set(side * 0.09, -0.08, 0)
    const thigh = makeCapsule(0.06, 0.38, cloth, segs)
    thigh.position.y = -0.22
    const knee = new Group()
    knee.position.y = -0.44
    const shin = makeCapsule(0.05, 0.36, cloth, segs)
    shin.position.y = -0.2
    const foot = makeCapsule(0.04, 0.14, skin, segs)
    foot.position.set(0, -0.4, 0.04)
    foot.rotation.x = Math.PI / 2
    foot.scale.set(1.1, 1, 1.4)
    knee.add(shin, foot)
    hip.add(thigh, knee)
    hips.add(hip)
    return { hip, knee }
  }
  const rLeg = makeLeg(1)
  const lLeg = makeLeg(-1)

  hips.add(torso)
  man.add(hips)
  return {
    man,
    right,
    left,
    legs: {
      rHip: rLeg.hip,
      rKnee: rLeg.knee,
      lHip: lLeg.hip,
      lKnee: lLeg.knee,
      hips,
      torso,
    },
  }
}

function findBone(root: Object3D, matcher: RegExp): Object3D | null {
  let found: Object3D | null = null
  // Prefer skeleton.bones — those are what SkinnedMesh samples
  root.traverse((obj) => {
    if (found) return
    const mesh = obj as Mesh & {
      isSkinnedMesh?: boolean
      skeleton?: { bones: Object3D[] }
    }
    if (mesh.isSkinnedMesh && mesh.skeleton?.bones) {
      for (const b of mesh.skeleton.bones) {
        if (matcher.test(b.name)) {
          found = b
          return
        }
      }
    }
  })
  if (found) return found
  root.traverse((obj) => {
    if (found) return
    const bone = obj as Bone
    if (bone.isBone && matcher.test(bone.name)) found = bone
  })
  if (found) return found
  root.traverse((obj) => {
    if (found) return
    if (matcher.test(obj.name)) found = obj
  })
  return found
}

function captureRest(bone: Object3D | null): BonePose | null {
  if (!bone) return null
  return { bone, rest: bone.quaternion.clone() }
}

/** Local Euler offset on top of bind quaternion (keeps A-pose rest). */
const _offsetQ = new Quaternion()
const _offsetE = new Euler()
function applyOffset(pose: BonePose | null, ox: number, oy: number, oz: number) {
  if (!pose) return
  _offsetE.set(ox, oy, oz, 'XYZ')
  _offsetQ.setFromEuler(_offsetE)
  pose.bone.quaternion.copy(pose.rest).multiply(_offsetQ)
}

function fitManToHeight(man: Object3D, targetHeight = 1.75) {
  const box = new Box3().setFromObject(man)
  const size = new Vector3()
  box.getSize(size)
  if (size.y < 0.01) return
  // Eric is already ~1.86m — only scale if far off
  if (Math.abs(size.y - targetHeight) / targetHeight < 0.12) {
    man.position.y -= box.min.y
    return
  }
  const s = targetHeight / size.y
  man.scale.multiplyScalar(s)
  const fitted = new Box3().setFromObject(man)
  man.position.y -= fitted.min.y
}

/**
 * Continuity hero: Renderpeople Eric (rigged A-pose) + Poly Haven cardboard box.
 * Pickup is posed directly on the skeleton (no baked walk clip).
 */
export function createContinuityHero(perf: PerfSettings): ContinuityHero {
  const root = new Group()
  root.name = 'ContinuityHero'

  const fallback = buildArticulatedMan(perf)
  let man: Group = fallback.man
  const right = fallback.right
  const left = fallback.left
  const legs = fallback.legs
  let useScanned = false
  let handBone: Object3D | null = null

  // Rigged pose targets — full body (rest → reach → grasp → lift)
  let hipPose: BonePose | null = null
  let spine01Pose: BonePose | null = null
  let spine02Pose: BonePose | null = null
  let spine03Pose: BonePose | null = null
  let neckPose: BonePose | null = null
  let headPose: BonePose | null = null
  let shoulderR: BonePose | null = null
  let upperArmR: BonePose | null = null
  let lowerArmR: BonePose | null = null
  let handR: BonePose | null = null
  let shoulderL: BonePose | null = null
  let upperArmL: BonePose | null = null
  let lowerArmL: BonePose | null = null
  let handL: BonePose | null = null
  let upperLegR: BonePose | null = null
  let lowerLegR: BonePose | null = null
  let footR: BonePose | null = null
  let upperLegL: BonePose | null = null
  let lowerLegL: BonePose | null = null
  let footL: BonePose | null = null

  root.add(man)

  const boxRestPos = new Vector3(0.42, 0.16, 0.35)
  const boxHeldLocal = new Vector3(0.04, -0.02, 0.1)
  const boxScale = 1.15

  const boxPlaceholder = new Mesh(
    new BoxGeometry(0.38, 0.32, 0.48),
    new MeshStandardMaterial({
      color: new Color(0xc4a574),
      roughness: 0.88,
      metalness: 0,
      transparent: true,
      opacity: 1,
    }),
  )
  let box: Object3D = boxPlaceholder
  box.position.copy(boxRestPos)
  root.add(box)

  let boxHeld = false
  let warpMode: 'normal' | 'float' | 'sink' | 'crush' | 'drift' = 'normal'
  let warpAmount = 0
  let disposed = false
  let lastPickupT = 0
  let lastLife = 0
  let lastPhase = 0
  let manBaseY = 0
  let outcomeMode: PickupOutcome | null = null

  const enableMaterialsTransparent = (obj: Object3D) => {
    obj.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        const mat = m as MeshStandardMaterial
        mat.transparent = true
        if (typeof mat.opacity !== 'number') mat.opacity = 1
        mat.needsUpdate = true
      }
    })
  }

  const attachBoxToHand = (attach: boolean) => {
    if (attach === boxHeld) return
    boxHeld = attach
    const grip = handBone ?? right.hand
    if (attach) {
      if (box.parent) box.parent.remove(box)
      grip.add(box)
      box.position.copy(boxHeldLocal)
      box.rotation.set(0.25, 0.6, 0.2)
      box.scale.setScalar(boxScale)
    } else {
      if (box.parent) box.parent.remove(box)
      root.add(box)
      box.position.copy(boxRestPos)
      box.rotation.set(0, 0.2, 0)
      box.scale.setScalar(boxScale)
    }
  }

  /**
   * Apply physics warp as an offset from the root's current transform.
   * Callers must set the desired unwarped position/scale before scrubPickup / setPhysicsWarp
   * (otherwise a previous warp frame's offset would compound).
   */
  const applyWarp = () => {
    const a = warpAmount
    if (box) box.scale.setScalar(boxScale)
    if (warpMode === 'normal' || a < 0.01) return

    const sx = root.scale.x
    const sy = root.scale.y
    const sz = root.scale.z

    switch (warpMode) {
      case 'float':
        root.position.y += a * 0.55 * sy
        break
      case 'sink':
        if (boxHeld) box.position.y = boxHeldLocal.y - a * 0.45
        else box.position.y = boxRestPos.y - a * 0.5
        break
      case 'crush':
        root.scale.set(
          sx * (1 + a * 0.15),
          Math.max(0.25 * sy, sy * (1 - a * 0.55)),
          sz * (1 + a * 0.1),
        )
        break
      case 'drift':
        root.rotation.z += a * 0.45
        root.position.x += a * 0.35 * sx
        break
    }
  }

  /** Soft breath + micro weight-shift so frozen poses still feel alive. */
  const lifeOffsets = (life: number, phase: number) => {
    const breath = Math.sin(life * 1.55 + phase) * 0.5 + 0.5
    const sway = Math.sin(life * 0.85 + phase * 1.7)
    return {
      breath,
      sway,
      chest: breath * 0.04,
      hipY: sway * 0.025,
      arm: sway * 0.04,
    }
  }

  const scrubArticulated = (t: number, life: number, phase: number) => {
    const reach = MathUtils.smoothstep(t, 0.02, 0.45)
    const grasp = MathUtils.smoothstep(t, 0.42, 0.58)
    const lift = MathUtils.smoothstep(t, 0.55, 1)
    const { breath, sway, chest, hipY, arm } = lifeOffsets(life, phase)

    // Natural idle: arms down from T/A, slight bend — not a stiff A-pose
    const idleDown = 0.55
    left.shoulder.rotation.set(
      MathUtils.lerp(idleDown, 0.35, reach) + arm * 0.5,
      MathUtils.lerp(0.05, -0.15, reach),
      MathUtils.lerp(0.55, 0.85, reach) + sway * 0.08,
    )
    left.elbow.rotation.set(MathUtils.lerp(0.35, 0.55, reach) + breath * 0.05, 0, 0)
    left.wrist.rotation.set(0, sway * 0.05, 0)

    right.shoulder.rotation.set(
      MathUtils.lerp(idleDown, -0.95, reach) + MathUtils.lerp(0, -0.4, lift) + arm * 0.2,
      MathUtils.lerp(0.05, -0.4, reach),
      MathUtils.lerp(-0.55, 0.35, reach),
    )
    right.elbow.rotation.set(MathUtils.lerp(0.35, 1.2, reach) - lift * 0.4, 0, 0)
    right.wrist.rotation.set(MathUtils.lerp(0, -0.45, grasp), MathUtils.lerp(0, 0.3, reach), 0)
    right.hand.scale.setScalar(MathUtils.lerp(1, 0.92, grasp))

    // Weight shift + soft knees
    legs.hips.rotation.set(reach * 0.12 + lift * -0.06 + chest, hipY, reach * -0.08)
    legs.torso.rotation.set(reach * 0.18 + lift * -0.1 + chest * 0.5, reach * -0.12, 0)
    legs.rHip.rotation.set(MathUtils.lerp(0.05, 0.28, reach) - lift * 0.12, 0, 0)
    legs.rKnee.rotation.set(MathUtils.lerp(0.08, 0.45, reach) - lift * 0.2, 0, 0)
    legs.lHip.rotation.set(MathUtils.lerp(0.05, -0.12, reach) + lift * 0.05, 0, sway * 0.04)
    legs.lKnee.rotation.set(MathUtils.lerp(0.08, 0.2, reach), 0, 0)

    man.rotation.y = MathUtils.lerp(0.12, -0.35, reach) + sway * 0.03
    man.position.x = MathUtils.lerp(0, 0.1, reach)
    man.position.y = manBaseY + lift * 0.035 + breath * 0.008

    if (grasp > 0.55) attachBoxToHand(true)
    else attachBoxToHand(false)

    if (boxHeld) right.shoulder.rotation.x += -lift * 0.45
  }

  /**
   * Full-body pose on Eric's rig:
   * relaxed stance → weight shift + reach → grasp → lift with contralateral balance.
   */
  const scrubRigged = (t: number, life: number, phase: number) => {
    const reach = MathUtils.smoothstep(t, 0.02, 0.48)
    const grasp = MathUtils.smoothstep(t, 0.42, 0.6)
    const lift = MathUtils.smoothstep(t, 0.55, 1)
    const { breath, sway, chest, hipY, arm } = lifeOffsets(life, phase)

    // Bring A-pose arms toward a natural hang at rest (t=0)
    const hang = 1 - reach * 0.85

    man.rotation.y = MathUtils.lerp(0.12, -0.42, reach) + sway * 0.035
    man.position.x = MathUtils.lerp(0, 0.1, reach)
    man.position.y = manBaseY + lift * 0.045 + breath * 0.01

    // Core: hip + stacked spine bend toward the box, then open on lift
    applyOffset(hipPose, reach * 0.14 - lift * 0.08 + chest * 0.4, hipY, reach * -0.1)
    applyOffset(spine01Pose, reach * 0.12 + lift * -0.06 + chest, reach * -0.08 + sway * 0.02, 0)
    applyOffset(spine02Pose, reach * 0.18 + lift * -0.08 + chest * 0.7, reach * -0.14, 0)
    applyOffset(spine03Pose, reach * 0.22 + lift * -0.1 + chest, reach * -0.22, reach * 0.04)
    applyOffset(neckPose, reach * 0.15 + lift * -0.05, reach * -0.1, 0)
    applyOffset(headPose, reach * 0.2 + lift * -0.08, reach * -0.25 + sway * 0.03, 0)

    // Right arm — primary reach / grasp / lift
    applyOffset(
      shoulderR,
      hang * 0.55 + reach * -0.45 + lift * -0.3,
      reach * 0.22,
      hang * -0.75 + reach * -0.95 + lift * -0.4,
    )
    applyOffset(
      upperArmR,
      hang * 0.35 + reach * -1.4 + lift * -0.9 + arm * 0.15,
      reach * 0.28,
      hang * -0.4 + reach * 0.55 + lift * 0.22,
    )
    applyOffset(lowerArmR, hang * 0.25 + reach * 1.3 - lift * 0.4, 0, reach * 0.32)
    applyOffset(handR, grasp * -0.55, reach * 0.35 + grasp * 0.25, grasp * 0.3)

    // Left arm — counterbalance (never stuck in A-pose)
    applyOffset(
      shoulderL,
      hang * 0.55 + reach * 0.15 + lift * 0.1 + arm * 0.5,
      reach * -0.12,
      hang * 0.75 + reach * 0.55 + lift * 0.2,
    )
    applyOffset(
      upperArmL,
      hang * 0.4 + reach * 0.25 + lift * -0.15 + arm,
      reach * -0.15 + sway * 0.05,
      hang * 0.45 + reach * 0.35,
    )
    applyOffset(lowerArmL, hang * 0.3 + reach * 0.45 + breath * 0.06, 0, reach * -0.12)
    applyOffset(handL, 0, sway * 0.08, grasp * 0.05)

    // Legs — plant, soften toward box, straighten slightly on lift
    applyOffset(upperLegR, hang * 0.04 + reach * 0.32 - lift * 0.14, reach * 0.06, reach * 0.04)
    applyOffset(lowerLegR, hang * 0.06 + reach * 0.55 - lift * 0.28, 0, 0)
    applyOffset(footR, reach * -0.12 + lift * 0.06, 0, 0)
    applyOffset(upperLegL, hang * 0.04 + reach * -0.1 + lift * 0.06, sway * 0.03, reach * -0.05)
    applyOffset(lowerLegL, hang * 0.06 + reach * 0.18 + breath * 0.02, 0, 0)
    applyOffset(footL, reach * -0.05, 0, 0)

    if (grasp > 0.55) attachBoxToHand(true)
    else attachBoxToHand(false)

    man.updateMatrixWorld(true)
  }

  const scrubPickup = (tRaw: number, life = lastLife, phase = lastPhase) => {
    const t = MathUtils.clamp(tRaw, 0, 1)
    lastPickupT = t
    lastLife = life
    lastPhase = phase
    if (useScanned) scrubRigged(t, life, phase)
    else scrubArticulated(t, life, phase)
    applyWarp()
  }

  const setOutcome = (
    outcome: PickupOutcome,
    t = 1,
    life = lastLife,
    phase = lastPhase,
  ) => {
    outcomeMode = outcome
    man.position.x = 0
    man.rotation.y = 0
    man.position.y = manBaseY
    const u = MathUtils.clamp(t, 0, 1)
    switch (outcome) {
      case 'lift': {
        // Gentle hold pulse around a successful lift
        const pulse = MathUtils.lerp(0.72, 0.95, u) + Math.sin(life * 1.1 + phase) * 0.06
        scrubPickup(MathUtils.clamp(pulse, 0.65, 1), life, phase)
        break
      }
      case 'leave': {
        // Partial reach that eases — never freezes in A-pose
        const pulse = MathUtils.lerp(0.2, 0.48, u) + Math.sin(life * 1.4 + phase) * 0.05
        scrubPickup(MathUtils.clamp(pulse, 0.12, 0.55), life, phase)
        attachBoxToHand(false)
        box.position.copy(boxRestPos)
        box.rotation.set(0, 0.2, 0)
        break
      }
      case 'drop': {
        const pulse = MathUtils.lerp(0.6, 0.82, u) + Math.sin(life * 1.2 + phase) * 0.04
        scrubPickup(MathUtils.clamp(pulse, 0.55, 0.88), life, phase)
        attachBoxToHand(false)
        box.position.set(
          boxRestPos.x + 0.15,
          0.08 + Math.abs(Math.sin(life * 2.2 + phase)) * 0.02,
          boxRestPos.z + 0.1,
        )
        box.rotation.set(0.6, 0.4 + Math.sin(life * 0.6 + phase) * 0.08, 0.9)
        break
      }
      case 'never': {
        const pulse = MathUtils.lerp(0.02, 0.18, u) + Math.sin(life * 1.3 + phase) * 0.03
        scrubPickup(MathUtils.clamp(pulse, 0, 0.25), life, phase)
        man.position.x = -0.55 + Math.sin(life * 0.7 + phase) * 0.02
        man.rotation.y = 0.55 + Math.sin(life * 0.9 + phase) * 0.04
        attachBoxToHand(false)
        box.position.copy(boxRestPos)
        box.rotation.set(0, 0.2, 0)
        break
      }
    }
    applyWarp()
  }

  const setPhysicsWarp: ContinuityHero['setPhysicsWarp'] = (mode, amount) => {
    warpMode = mode
    warpAmount = MathUtils.clamp(amount, 0, 1)
    applyWarp()
  }

  const setOpacity = (opacity: number) => {
    setGroupOpacity(root, opacity)
  }

  const cloneInstance = () => root.clone(true)

  const dispose = () => {
    disposed = true
    disposeObject3D(root)
    root.clear()
  }

  const bindRigBones = (rig: Group) => {
    handBone = findBone(rig, /^hand_r$/i)
    hipPose = captureRest(findBone(rig, /^hip$/i))
    spine01Pose = captureRest(findBone(rig, /^spine_01$/i))
    spine02Pose = captureRest(findBone(rig, /^spine_02$/i))
    spine03Pose = captureRest(findBone(rig, /^spine_03$/i))
    neckPose = captureRest(findBone(rig, /^neck$/i))
    headPose = captureRest(findBone(rig, /^head$/i))
    shoulderR = captureRest(findBone(rig, /^shoulder_r$/i))
    upperArmR = captureRest(findBone(rig, /^upperarm_r$/i))
    lowerArmR = captureRest(findBone(rig, /^lowerarm_r$/i))
    handR = captureRest(handBone)
    shoulderL = captureRest(findBone(rig, /^shoulder_l$/i))
    upperArmL = captureRest(findBone(rig, /^upperarm_l$/i))
    lowerArmL = captureRest(findBone(rig, /^lowerarm_l$/i))
    handL = captureRest(findBone(rig, /^hand_l$/i))
    upperLegR = captureRest(findBone(rig, /^upperleg_r$/i))
    lowerLegR = captureRest(findBone(rig, /^lowerleg_r$/i))
    footR = captureRest(findBone(rig, /^foot_r$/i))
    upperLegL = captureRest(findBone(rig, /^upperleg_l$/i))
    lowerLegL = captureRest(findBone(rig, /^lowerleg_l$/i))
    footL = captureRest(findBone(rig, /^foot_l$/i))
  }

  const ready = Promise.all([
    loadGltf(DimensionAssets.continuityMan)
      .then(({ scene }) => {
        if (disposed) {
          disposeObject3D(scene)
          return
        }
        root.remove(man)
        disposeObject3D(man)

        man = scene as Group
        man.name = 'ContinuityManEric'
        enableMaterialsTransparent(man)
        fitManToHeight(man, perf.tier === 'high' ? 1.8 : 1.7)
        man.updateMatrixWorld(true)
        manBaseY = man.position.y
        root.add(man)

        man.traverse((o) => {
          const mesh = o as Mesh & { isSkinnedMesh?: boolean }
          if (!mesh.isSkinnedMesh) return
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const m of mats) {
            const mat = m as MeshStandardMaterial & { skinning?: boolean }
            mat.skinning = true
            mat.needsUpdate = true
          }
        })

        bindRigBones(man)
        useScanned = true
        if (outcomeMode) setOutcome(outcomeMode, 1, lastLife, lastPhase)
        else scrubPickup(lastPickupT, lastLife, lastPhase)
      })
      .catch(() => {
        /* keep articulated stand-in */
      }),
    loadGlb(DimensionAssets.box)
      .then((model) => {
        if (disposed) {
          disposeObject3D(model)
          return
        }
        model.scale.setScalar(boxScale)
        const held = boxHeld
        box.parent?.remove(box)
        disposeObject3D(box)
        box = model
        if (held) {
          const grip = handBone ?? right.hand
          grip.add(box)
          box.position.copy(boxHeldLocal)
          box.rotation.set(0.25, 0.6, 0.2)
        } else {
          root.add(box)
          box.position.copy(boxRestPos)
          box.rotation.set(0, 0.2, 0)
        }
        setGroupOpacity(box, 1)
      })
      .catch(() => {
        /* keep placeholder */
      }),
  ]).then(() => undefined)

  scrubPickup(0)

  return {
    root,
    get box() {
      return box
    },
    get man() {
      return man
    },
    ready,
    scrubPickup,
    setOutcome,
    setOpacity,
    setPhysicsWarp,
    cloneInstance,
    dispose,
  }
}

/** Map section progress to a back-and-forth editor playhead (0→1→0.35→0.85). */
export function editorPlayhead(sectionProgress: number): number {
  const sp = MathUtils.clamp(sectionProgress, 0, 1)
  if (sp < 0.35) return MathUtils.smoothstep(sp, 0, 0.35)
  if (sp < 0.55) {
    const u = MathUtils.smoothstep(sp, 0.35, 0.55)
    return MathUtils.lerp(1, 0.35, u)
  }
  const u = MathUtils.smoothstep(sp, 0.55, 1)
  return MathUtils.lerp(0.35, 0.85, u)
}
