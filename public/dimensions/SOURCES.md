# 7 Dimensions — asset sources

All files under `public/dimensions/` are imported from Tier A / Tier D / Tier E sources per [`ASSET_SOURCES.md`](../../ASSET_SOURCES.md).
Do not replace with generative AI meshes or neon kits.

| Asset | Source | License | Notes |
|-------|--------|---------|-------|
| `hdri/dikhololo_night_1k.hdr` | [Poly Haven — Dikhololo Night](https://polyhaven.com/a/dikhololo_night) | CC0 | Shared void IBL; reflections only (bg stays black) |
| `textures/metal/*` | [ambientCG — Metal042A](https://ambientcg.com/a/Metal042A) | CC0 | 1K JPG Color / NormalGL / Roughness / Metalness |
| `textures/paper/*` | [ambientCG — Paper001](https://ambientcg.com/a/Paper001) | CC0 | 1K JPG Color / NormalGL / Roughness |
| `textures/plaster/*` | [ambientCG — Plaster001](https://ambientcg.com/a/Plaster001) | CC0 | 1K JPG Color / NormalGL / Roughness |
| `models/ceramic_vase_01/` | [Poly Haven — Ceramic Vase 01](https://polyhaven.com/a/ceramic_vase_01) | CC0 | 1K glTF — 0D singular presence |
| `models/brass_candleholders/` | [Poly Haven — Brass Candleholders](https://polyhaven.com/a/brass_candleholders) | CC0 | 1K glTF — warm metal accent / 1D obstacle scale |
| `models/school_desk/` | [Poly Haven — School Desk 01](https://polyhaven.com/a/SchoolDesk_01) | CC0 | 1K glTF — legacy 3D massing (superseded by continuity hero) |
| `models/cardboard_box_01/` | [Poly Haven — Cardboard Box 01](https://polyhaven.com/a/cardboard_box_01) | CC0 | 1K glTF — continuity prop (3D→7D grasp) |
| `models/continuity_hero/man.glb` | [Renderpeople Free — Rigged People](https://renderpeople.com/free-3d-people/) `rp_eric_rigged_001_yup_a` FBX → FBX2glTF → 1K WebP | Free commercial (Renderpeople ToU) | Scanned male, Y-up A-pose rig; pickup posed on `shoulder_r` / `upperarm_r` / `lowerarm_r` / `hand_r` |

Procedural articulated man remains a fallback if `man.glb` fails to load. Editor chrome is glue only.
