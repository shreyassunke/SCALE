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
  signal-faint: "#6e6e6e"
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

Strict black/white only. `void` is absolute black. `signal` is primary type and live affordances. `signal-dim` / `signal-faint` mark coming-soon and inactive scene cues. No hue, no neon, no colored glow.

## Typography

- **Display:** Bricolage Grotesque — brand word SCALE and short supporting line.
- **HUD:** Azeret Mono — environment labels, status, coordinates. Tracked uppercase for system chrome only; one kicker max.

## Layout

One full-viewport composition. Brand and tagline anchor left/center; environment list reads as a vertical track legend (right on desktop, stacked below on mobile). Cinematic hero video occupies the full bleed behind UI (forced grayscale + soft veil so signal type stays readable). No card grids, no stat strips, no multi-column marketing sections on the hub.

## Elevation & Depth

Depth comes from the hero film and a quiet black veil, not drop shadows. Soft text shadows keep HUD legible over bright frames. Optional film grain as a flat CSS overlay at low opacity.

## Shapes

Full-bleed film plane; no rounded cards. Focus rings are 1px white outlines with offset. Pointer targets remain full-width list rows.

## Components

- **Environment (live):** white label; hover/focus subtly brightens the film; Enter / click navigates.
- **Environment (soon):** dim label + quiet “Soon” status; focusable; no navigation.
- **Back link (journey HUD):** thin “SCALE” text link to `/`.

## Do's and Don'ts

**Do** keep absolute black grounds and white signal. **Do** let SCALE dominate the first viewport. **Do** treat the menu as instrument chrome.

**Don't** introduce saturated color, purple/neon glows, glassmorphism as decoration, or equal-weight feature cards. **Don't** bury the brand in a small nav word.
