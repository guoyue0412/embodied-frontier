# Task 10 report: bundle, static, accessibility, and browser gates

## Status

DONE. Task 10 gates are implemented and verified in the isolated worktree.

## Delivered

- Added `scripts/check-bundle-budget.mjs`.
  - Emits and reads a deterministic `dist/astro-manifest.json` from the Astro
    client bundle.
  - Follows the emitted import graph, traversing static imports only and
    excluding dynamic Three.js/Cytoscape branches.
  - Gzip-checks emitted JavaScript and reports initial-entry membership,
    package leakage, and exact byte counts.
- Added `scripts/check-static-site.mjs`.
  - Parses every built HTML document and validates one `<main>` and `<h1>`,
    `lang`, image `alt`, internal file/fragment targets, URL schemes,
    `javascript:` rejection, external `_blank` rel safety, iframe titles, and
    accessible names for interactive controls.
  - Resolves both root and configured GitHub Pages base paths.
- Extended `scripts/browser-qa.mjs` with real Chrome CDP evidence for:
  - desktop 1440×900 hero/search/graph/console checks;
  - mobile touch 360×800 overflow, 44px controls, and no Three-related
    requests;
  - reduced-motion desktop static hero, no continuous animation, search,
    reading, and graph usability;
  - no-JavaScript paper and relationship-list fallbacks;
  - pre/post activation Cytoscape request evidence;
  - screenshots and JSON report under `artifacts/browser-qa/`.
- Added `tests/bundle-budget.test.mjs` and `tests/static-site.test.mjs`.
- Added `qa:browser` and unified `verify` scripts to `package.json`.
- Kept the paper island’s SSR `hidden` filter controls contract while proving
  the static paper cards and no-JS note remain available.
- Updated the runtime-boundary test to scope shipped-runtime dependency
  assertions to `src/` and `lib/`; the quality-gate tooling is intentionally
  allowed to name the packages it audits.

## TDD evidence

- RED: `node --test tests/bundle-budget.test.mjs` failed with the expected
  `ERR_MODULE_NOT_FOUND` for the absent checker.
- GREEN: the focused bundle/static tests passed after the checkers were added.
- Browser regressions found and fixed: hero assertion was run after returning
  to `/`; graph readiness now selects a node before requiring a path; browser
  expressions now return booleans instead of DOM objects.

## Verification

### Unified local gate

Command:

```bash
ASTRO_TELEMETRY_DISABLED=1 npm run verify
```

Result: exit 0; 65/65 Node tests passed, ESLint passed, static site checker
passed all 14 HTML documents, and bundle checker passed:

```text
initialInteractiveGzip: 100255 bytes
budget: 122880 bytes
sharedIncludesThree: false
sharedIncludesCytoscape: false
manifest: dist/astro-manifest.json
```

### Root production preview browser gate

Command:

```bash
SITE_URL=http://127.0.0.1:4323/ npm run qa:browser
```

The command ran against a real Astro production preview. Result: exit 0;
190 assertions, 30 route checks across the three profiles and no-JavaScript
profile, 0 console errors, 0 failures, and 5 screenshots. The final JSON
evidence is `artifacts/browser-qa/report.json`.

### GitHub Pages base-path gate

Commands:

```bash
ASTRO_TELEMETRY_DISABLED=1 BASE_PATH=/embodied-frontier SITE_URL=https://example.github.io/embodied-frontier/ npm run build
BASE_PATH=/embodied-frontier node scripts/check-static-site.mjs dist
BASE_PATH=/embodied-frontier node scripts/check-bundle-budget.mjs dist
BASE_PATH=/embodied-frontier SITE_URL=http://127.0.0.1:4350/embodied-frontier/ npm run qa:browser
```

The built output passed static and bundle checks with
`initialInteractiveGzip: 100283`, both lazy-package flags false, and the
manifest present. A temporary prefix-aware static server mapped the real
production `dist/` under `/embodied-frontier/` for the browser run; that run
also passed with 190 assertions, 30 route checks, 0 console errors, and 0
failures. The worktree was then rebuilt at the root base and the final root
browser report was regenerated.

## Artifacts

- `artifacts/browser-qa/report.json`
- `artifacts/browser-qa/desktop-home.png`
- `artifacts/browser-qa/desktop-graph.png`
- `artifacts/browser-qa/mobile-home.png`
- `artifacts/browser-qa/reduced-motion-home.png`
- `artifacts/browser-qa/reduced-motion-graph.png`

## Limitations

- Astro’s stock preview server does not mount a configured `BASE_PATH` as a
  URL prefix; the base-path browser run therefore used a temporary static
  prefix adapter over the same production `dist/` bytes. Root preview was
  verified directly with `astro preview`.
- External URLs are validated deterministically for scheme and safety, but no
  live internet availability check is performed by CI.
- Browser evidence is local headless Chrome evidence; it does not claim an
  externally deployed GitHub Pages smoke test.
