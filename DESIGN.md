# Design

<!-- impeccable:design-schema 1 -->
<!-- Direction contract seed: 990af282 · grounded index 6 · collider event-display → B&W particle void -->

---
name: SCALE
description: Black-and-white visual simulation hub for perspective across environments
colors:
  void: "#000000"
  signal: "#ffffff"
  signal-dim: "#9a9a9a"
  signal-faint: "#767676"
  ring: "#c8c8c8"
  focus: "#ffffff"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 12vw, 7.5rem)"
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.01em"
  hud:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "0.72rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.12em"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.75rem"
  lg: "3rem"
  xl: "5rem"
rounded:
  none: "0"
components:
  env-live:
    backgroundColor: "transparent"
    textColor: "{colors.signal}"
    typography: "{typography.hud}"
    padding: "0.65rem 0"
  env-soon:
    backgroundColor: "transparent"
    textColor: "{colors.signal-dim}"
    typography: "{typography.hud}"
    padding: "0.65rem 0"
---

## Overview

SCALE’s visual world is a **monochrome cinematic void**: near-black vacuum, a quiet full-bleed hero film (grayscale), spare technical labels. The hub treats environments as selectable tracks in one vast field of perspective. Brand word **SCALE** is the largest signal on the first viewport; UI recedes into HUD chrome.

## Colors

Strict black/white for hub, chrome, and HUD. `void` is absolute black. `signal` is primary type and live affordances. `signal-dim` / `signal-faint` mark coming-soon and inactive scene cues. No hue, no neon, no colored glow on UI.

**Cosmic Scale exception:** journey *content* (planets, imagery) may be full photoreal color when focused; unfocused neighbors desaturate toward the void. Overlay typography and chrome stay monochrome.

**7 Dimensions exception:** journey *content* may use restrained chromatic cinematic materials (PBR + HDRI reflections, warm key / cool fill, soft amber events). Never neon cyan/pink additive Line+Points kits. Overlay typography and chrome stay monochrome.

## Typography

- **Display:** Bricolage Grotesque — brand word SCALE, journey titles, and short supporting lines.
- **HUD:** Azeret Mono — environment labels, status, coordinates, journey chrome. Tracked uppercase for system chrome only; one kicker max.
- Shared across hub, Cosmic Scale, and 7 Dimensions chrome (scene content may differ).

## Layout

One full-viewport composition. Brand and tagline anchor left/center; environment list reads as a vertical track legend (right on desktop, stacked below on mobile). Cinematic hero video occupies the full bleed behind UI (forced grayscale + soft veil so signal type stays readable). No card grids, no stat strips, no multi-column marketing sections on the hub.

## Elevation & Depth

Depth comes from the hero film and a quiet black veil, not drop shadows. Soft text shadows keep HUD legible over bright frames. Optional film grain as a flat CSS overlay at low opacity. The hub brand word **SCALE** uses a live light-room treatment: metallic fill + specular highlight driven by sampled hero-video luminance (strict mono; no hue). Reduced-motion falls back to a static sheen.

## Shapes

Full-bleed film plane; no rounded cards. Focus rings are 1px white outlines with offset. Pointer targets remain full-width list rows.

## Components

- **Environment (live):** white label; hover/focus subtly brightens the film; Enter / click navigates.
- **Environment (soon):** dim label + quiet “Soon” status; focusable; no navigation.
- **Back link (journey HUD):** thin “SCALE” text link to `/`.

## Do's and Don'ts

**Do** keep absolute black grounds and white signal. **Do** let SCALE dominate the first viewport. **Do** treat the menu as instrument chrome.

**Don't** introduce saturated color on hub/chrome, purple/neon glows, glassmorphism as decoration, or equal-weight feature cards. **Don't** bury the brand in a small nav word. **Don't** invent procedural planet/galaxy looks — Cosmic Scale uses sourced scientific assets only.

## Cosmic Scale surface

- Canon: [neal.fun/size-of-space](https://neal.fun/size-of-space/) grammar inside SCALE chrome.
- Full-viewport WebGL void; black mirror floor + hairline horizon (no grid).
- True relative sizes; focused body fills the frame; priors shrink left; next body hidden until zoom-out step.
- Focus overlay: large object name + one-line blurb with live metric from `sizeMeters` (diameter for spheres, span otherwise), top center.
- Back link: thin SCALE → `/`.
- Assets: NASA / Solar System Scope (CC-BY) / licensed scientific imagery via local `public/cosmic/` manifest.

## 7 Dimensions surface

- Full-viewport scroll-driven WebGL journey (0D→7D); Lenis + section holds so the next dim never appears under current copy.
- Shared cinematic foundation: Poly Haven HDRI (reflections), ACES tone mapping, subtle bloom (high perf), quiet CSS film grain.
- **Continuity spine (3D→7D):** Poly Haven cardboard box + man grasp. 4D = video-editor timeline scrub; 5D = alternate takes; 6D = warped physics on the same scene; 7D = catalog. Hero content from Tier A/D under `public/dimensions/` (see `public/dimensions/SOURCES.md`); procedural geometry is path/transition glue only.
- Overlay: large title + body + aside; HUD chrome monochrome (SCALE / 7 Dimensions / dim label / progress).
- Back link: thin SCALE → `/`.
