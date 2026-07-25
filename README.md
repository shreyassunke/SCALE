# All 7 Dimensions

A cinematic, scroll-driven journey from **0D → 7D**, inspired by the degree-of-freedom framing in [this dimensional explainer](https://www.youtube.com/watch?v=-gPFxMHWV8w).

## Stack

- Vite + TypeScript (vanilla, no React)
- Three.js — single continuous scene
- GSAP ScrollTrigger — per-section progress
- Lenis — inertial scroll (synced with ScrollTrigger)

## Develop

```bash
npm install
npm run dev
```

## Journey map

| Dim | Idea (from the video’s teaching) | Visual |
|-----|----------------------------------|--------|
| **0D** | Point / coordinate only — movement meaningless | Glowing point |
| **1D** | Forward/back; an obstacle ends the universe | Line + blocker |
| **2D** | Flatland; see one dim lower; open box from above | Plane, circle→line, house + finger |
| **3D** | Outer shells only; depth is reconstructed | Room + closed safe |
| **4D** | Minkowski time; life as a spacetime worm | Timeline + worm of selves |
| **5D** | *Metaphor* — branching possibilities (Everett) | Fractal tree of outcomes |
| **6D** | *Metaphor* — other physics / law landscapes | Colored universe field |
| **7D** | *Metaphor* — all logically possible realities | Frozen lattice / absolute map |
| **Coda** | Return to the 3D incubator | Scene eases back toward 3-space |

Copy lives in `src/content/copy.ts`. Beats for 5D–7D carry a **Metaphor** tag so the framing stays honest.

## Architecture

Scroll maps to a continuous `dimension` float (`2.4` = 40% through 2D→3D). Camera, morphs, and captions all read from that value.
