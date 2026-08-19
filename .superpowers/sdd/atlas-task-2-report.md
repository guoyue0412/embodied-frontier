# Task 2 Report: Add the progressive orbital research navigator

## Status

DONE. Implementation commits: `f7a85d1` (`feat: add progressive atlas navigator`) and `27ddcca` (`fix: close atlas navigator advisory gaps`).

- Base SHA: `5c6cbf989b9427442b7900fd007d2a6dd81a85cd`
- Scope: deterministic Atlas geometry, static-first React island, responsive orbital/static presentation, and lifecycle-safe motion.
- No new dependency, runtime content fetch, deployment, push, or progress-ledger edit.

## Implementation

- Added `src/lib/atlas-navigator.mjs` with deterministic `computeAtlasPositions(count, radius)` and wrapped `nextAtlasIndex(current, direction, count)` helpers.
- Added `src/components/islands/AtlasNavigator.tsx`. Astro/React server output contains the complete six-link destination set before hydration. Hydration adds the active preview, pointer/focus activation, arrow-key movement, pause/resume, and a `data-atlas-navigator-ready="true"` marker.
- Orbit RAF starts only while the navigator is visible, the document is visible, motion is allowed, and the orbit is not paused. `IntersectionObserver`, `visibilitychange`, `matchMedia`, RAF cancellation, and cleanup keep the enhancement bounded.
- Updated `AtlasHero.astro` to pass base-safe `href` values through `client:visible`; the former duplicate static destination grid and `noscript` copy were removed.
- Added desktop radial coordinates, focus-visible states, 44px controls, mobile/touch two-column static layout, and reduced-motion static grid fallback in `hero.css`.

## TDD evidence

RED:

```text
node --test tests/atlas-navigator.test.mjs
ERR_MODULE_NOT_FOUND: src/lib/atlas-navigator.mjs
```

GREEN:

```text
node --test tests/atlas-navigator.test.mjs tests/source-boundaries.test.mjs tests/bundle-budget.test.mjs
11 passed, 0 failed
```

## Verification evidence

- `npm run build`: passed; 14 static pages generated.
- `npm test`: passed, 106/106 tests.
- `npm run lint`: passed with exit code 0.
- `node scripts/check-static-site.mjs dist`: passed; 14 files, 0 errors.
- `node scripts/check-bundle-budget.mjs dist`: passed; initial interactive gzip `102552` bytes, `sharedIncludesThree: false`, `sharedIncludesCytoscape: false`.
- `BASE_PATH=/embodied-frontier npm run build`, base-aware focused tests, and `BASE_PATH=/embodied-frontier node scripts/check-static-site.mjs dist`: passed; 14 files, 0 errors.
- Production `npm run qa:browser` against the built root site passed with `failures: []` across desktop 1440px, mobile touch 360px, reduced-motion, and no-JavaScript profiles; no console/resource/http errors and no horizontal overflow. Desktop/mobile/reduced-motion screenshots were inspected from the run artifacts.
- Focused built-page browser smoke passed: hydration marker `true`, six links with real hrefs, keyboard ArrowRight selection, orbit phase movement, pause phase hold, resume phase movement, offscreen suspension, and on-screen resume all returned `true`.
- `git diff --check`: passed.

## Advisory closure

Follow-up commit `27ddcca` closes the three visual-acceptance advisories:

- `(max-width: 767px), (pointer: coarse)` capability evaluation now selects `data-atlas-navigator-mode="static"` and stops/cancels the RAF before it can start or continue. Desktop orbit, pause, offscreen, and document-hidden states still stop through the same bounded animation gate.
- Reduced-motion static nodes explicitly set `transition: none`, removing the residual 180ms node transition.
- Active preview semantics use `data-atlas-active` plus `aria-describedby="atlas-active-preview"`; destination anchors retain normal keyboard navigation and no longer claim `aria-current`.

Follow-up verification:

- Focused navigator suite: 5/5 passed; navigator/source/bundle suite: 12/12 passed; full `npm test`: 106/106 passed; `npm run lint`: passed.
- Root and `BASE_PATH=/embodied-frontier` production builds/static checks passed; root bundle check remained under budget at `102552` bytes gzip with Three/Cytoscape absent from the shared initial bundle.
- Fresh production `npm run qa:browser` completed with `failures: []` for desktop, mobile-touch, reduced-motion, and no-JavaScript profiles.
- Direct built-page browser smoke observed mobile `mode=static`, stable empty phase, six links, `ariaCurrent=0`, and one active preview description; desktop `mode=orbit` with changing phase and ArrowRight retaining `aria-describedby="atlas-active-preview"`; reduced-motion `mode=static` with computed transition property `none`.
- Unrelated plan/spec edits and browser artifact modifications were preserved unstaged; no push or progress-ledger edit was made.

## Verification limit

`npm run content:validate` retains the pre-existing unrelated TypeScript error in `src/components/islands/HeroExperience.tsx:35` (`evaluateHeroCapabilities` returns an inferred `string` status), as documented by Task 1. No Task 2 source introduced a content-validation diagnostic.
