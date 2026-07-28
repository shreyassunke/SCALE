# Continuity hero — build pipeline

## Active stack

| Role | Asset | Path |
|------|-------|------|
| Man | Renderpeople **Eric** rigged Y-up A-pose | `public/dimensions/models/continuity_hero/man.glb` (~1.1 MB) |
| Box | Poly Haven Cardboard Box 01 | `public/dimensions/models/cardboard_box_01/` |
| Source FBX | `renderpeople_free_rigged_people_FBX/rp_eric_rigged_001_FBX/rp_eric_rigged_001_yup_a.fbx` | |

## Why rigged (not animated)

Rigged A-pose lets runtime pose `shoulder_r` → `hand_r` for reach / grasp / lift. Baked walk clips fight that control.

## Rebuild man.glb

```powershell
cd all-7-dimensions

# Resize textures
node tools/continuity-hero/resize-tex.mjs `
  "..\renderpeople_free_rigged_people_FBX\rp_eric_rigged_001_FBX\tex" `
  "tools\continuity-hero\stage_eric\tex" 2048

# Convert (Y-up A-pose)
tools\continuity-hero\FBX2glTF\FBX2glTF-windows-x86_64\FBX2glTF-windows-x86_64.exe --binary `
  --input tools\continuity-hero\stage_eric\rp_eric_rigged_001_yup_a.fbx `
  --output public\dimensions\models\continuity_hero\man_raw

# Resize + WebP only (avoid optimize/flatten — keeps skeleton)
npx @gltf-transform/cli resize public/dimensions/models/continuity_hero/man_raw.glb `
  public/dimensions/models/continuity_hero/man.glb --width 1024 --height 1024
npx @gltf-transform/cli webp public/dimensions/models/continuity_hero/man.glb `
  public/dimensions/models/continuity_hero/man.glb
```

## Runtime

`continuityHero.ts` loads Eric, captures rest rotations, then lerps bones for pickup. Box attaches to `hand_r` on grasp.
