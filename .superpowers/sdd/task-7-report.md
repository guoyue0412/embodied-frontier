# Task 7 Report: procedural Three.js embodiment island

## Status

DONE. The first-party procedural embodiment is committed in
`44e7e85e955b85a42c75db7b712ec1fb42c2fd65`.

## Delivered

- Added `EmbodimentUnit.tsx` with a server-rendered `<picture>` fallback before
  the canvas, a fine-pointer desktop gate requiring `(min-width: 768px)`, a
  reduced-motion rejection, an `IntersectionObserver` visibility/intent gate,
  document visibility pause, pointer normalization, resize handling, and
  deterministic cleanup.
- Added `create-embodiment-scene.ts`, a first-party scene made only from a
  capsule torso, sphere head, paired upper/lower cylinder arms and legs, and
  emissive joint spheres. It uses an orthographic camera, one white key light,
  one cyan rim light, a transparent renderer, and a pixel ratio capped at 2.
  It has no model, texture, or network asset request.
- `dispose()` cancels RAF, disposes every registered geometry/material and the
  renderer, calls `renderer.forceContextLoss()`, removes the canvas context
  listener, and clears the scene. WebGL initialization and context-loss paths
  keep the static fallback visible.
- Mounted the island in `HeroExperience.tsx` while preserving Task 6's static
  hero, pointer-event boundary, and existing optional visual lifecycle.
- Added independent orbital/coordinate styling in
  `src/styles/embodiment-unit.css` and extended the Three.js provenance notice
  with package version, repository, copyright, MIT license, and both local
  consumers.
- Updated the Task 6 source-boundary test so Three/WebGL is allowed only in
  the declared lazy consumers; copied branding and runtime research API
  boundaries remain rejected.

## TDD evidence

- RED: `node --test tests/embodiment-gates.test.mjs` failed with the expected
  `ENOENT` for the absent `EmbodimentUnit.tsx`.
- GREEN: the focused contract passes after implementation.

## Verification evidence

- `ASTRO_TELEMETRY_DISABLED=1 npm test`: passed, 49/49 tests; Astro built 14
  pages and all source/content/rendered/lifecycle tests passed.
- `ASTRO_TELEMETRY_DISABLED=1 npm run lint`: passed with exit code 0.
- `ASTRO_TELEMETRY_DISABLED=1 npm run content:validate`: passed with 0 Astro
  errors; content compiler produced 5 papers, 3 roadmap stages, 3 projects,
  3 models, 3 datasets, 5 search records, 11 graph nodes, and 16 graph edges.
- `ASTRO_TELEMETRY_DISABLED=1 BASE_PATH=/embodied-frontier/ SITE_URL=https://example.github.io/embodied-frontier/ npm run build` passed; focused base-path tests passed 5/5 (`astro-shell`, `hero-fallback`, `embodiment-gates`). Built HTML uses `/embodied-frontier/hero-static.webp`, `/embodied-frontier/_astro/...`, and the static `<picture>` fallback.
- Final root build bundle audit: `HeroExperience` 87,292 bytes / 33,554 gzip;
  renderer client 184,122 / 57,328 gzip; React 8,036 / 3,113 gzip; shared
  lifecycle 850 / 458 gzip; site-path 621 / 399 gzip. Initial homepage
  interactive total is 94,852 gzip, below the 120 KiB budget.
- Lazy assets are separate: `create-embodiment-scene` 3,438 / 1,769 gzip
  imports `three.module` 488,987 / 120,957 gzip. `GridDistortion` remains a
  separate 4,451 / 2,179 gzip lazy chunk. Three.js is not in the initial
  executable import graph; the HeroExperience dependency map only names the
  lazy edge.
- `git diff --cached --check` passed before the implementation commit.

## Verification limits

No browser session was run in this sandbox, so actual GPU/WebGL rendering and
network-request capture on a touch device remain for normal local/CI browser
QA. Static SSR fallback, capability gates, context-loss handling, cleanup
contracts, base paths, build output, tests, lint, content validation, and lazy
bundle separation were verified locally.
