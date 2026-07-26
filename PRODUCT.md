# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Curious adults exploring big ideas — dimensions, cosmic size, consciousness, civilizations — who want visceral perspective, not a textbook. They arrive seeking awe and orientation: relating what they know to what they don’t.

## Product Purpose

SCALE is a visual simulation tool for understanding scale. Visitors choose environments that play out different orderings of existence (smallest to largest objects, all 7 dimensions, levels of consciousness, levels of civilizations, and future peers). Success is a felt sense of depth and proportion — referencing the familiar against the vast.

## Positioning

Not an encyclopedia or a dashboard of facts. A cinematic, quiet interface where **SCALE** is the keyword and each environment is an experiential lens. Perspective is the product; content is the vehicle.

## Operating Context

- Web experience (Vite + TypeScript + Three.js).
- Entry: landing/menu hub; environments are separate journeys.
- Live routes: `/dimensions` (7 Dimensions), `/cosmic` (Cosmic Scale).
- Future environments ship as additional routes; stubs appear as “coming soon” until built.

## Capabilities and Constraints

- Live: 7 Dimensions (scroll-driven 0D→7D WebGL journey); Cosmic Scale (log zoom through sourced scientific imagery at `/cosmic`).
- Menu stubs: Levels of Consciousness, Levels of Civilizations.
- Stack: Vite multi-page, vanilla TS, Three.js, GSAP, Lenis — no React.
- Cosmic Scale content must use imported NASA / scientific assets — no invented procedural bodies.

## Brand Commitments

- Product name: **SCALE**.
- Aesthetic (binding): vast, quiet, cinematic, calm, minimalist. Hub and HUD chrome are **strict black and white**. Signal over noise. Never bright neon or off-theme chrome color that adds noise.
- Environment exception: Cosmic Scale may show **photoreal chromatic scientific content** (focused object saturated; neighbors desaturate). Chrome remains monochrome.
- Intent: feel like a visual simulation tool, not a marketing site.

## Evidence on Hand

- Existing journeys: All 7 Dimensions (`dimensions.html`); Cosmic Scale (`cosmic.html` / `src/cosmic/` + `public/cosmic/`).
- Reference mood images (user-provided): void spaces, perspective grids, particle fields, silhouettes for scale — match feel, not content.

## Product Principles

1. Perspective first — every surface should orient the visitor in depth and size.
2. Signal over noise — remove anything that does not serve scale or choice.
3. Environments are lenses — the hub chooses; the journey demonstrates.
4. Honesty about readiness — live vs coming soon must be quiet and clear.
5. Continuity — the hub and journeys share the same monochrome simulation language.
