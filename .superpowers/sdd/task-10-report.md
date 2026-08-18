# Task 10 report: bundle, static, accessibility, and browser gates

## Status

DONE. Task 10 gates are implemented and verified in the isolated worktree.

## Delivered

- Added `scripts/check-bundle-budget.mjs`.
  - Emits and reads a deterministic `dist/astro-manifest.json` from the Astro
    client bundle and fails closed when the manifest is missing or malformed.
  - Includes every initial module `script[src]` and `rel=modulepreload` asset,
    then follows the emitted import graph while excluding dynamic
    Three.js/Cytoscape branches.
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
  - keyboard Tab focus and visible focus-ring evidence, Space/Enter activation,
    real mouse and touch activation, and HTTP/resource failure reporting;
  - observable DotGrid, GridDistortion, and Embodiment ready/fallback states;
  - screenshots and JSON report under `artifacts/browser-qa/`.
- Added `scripts/serve-dist.mjs` and `scripts/verify-production.mjs`; `npm run
  verify` now builds, runs all tests, lints, checks static HTML and bundle
  budgets, starts/stops a prefix-aware production-dist server, and runs the
  browser gate with deterministic exit status.
- Added `tests/bundle-budget.test.mjs` and `tests/static-site.test.mjs`,
  including negative fixtures for missing manifests, oversized modulepreload,
  nested relative links, unsafe URLs, duplicate landmarks, unlabeled controls,
  and missing image alt text.
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
  expressions now return booleans instead of DOM objects; mobile screenshots
  now explicitly navigate to `/`; and browser reports no longer persist
  absolute worktree paths, timestamps, or ephemeral ports.

## Verification

### Unified local gate

Command:

```bash
npm run verify
```

Result: exit 0; 69/69 Node tests passed, ESLint passed, static site checker
passed all 14 HTML documents, bundle checker passed, and self-contained
production browser QA passed:

```text
initialInteractiveGzip: 100349 bytes
budget: 122880 bytes
sharedIncludesThree: false
sharedIncludesCytoscape: false
manifest: dist/astro-manifest.json
```

The root run produced 243 assertions, 33 route checks, 0 console errors,
0 resource/HTTP failures, 0 failures, and 5 screenshots. The CI workflow
invokes this same `npm run verify` command.

### Root production browser gate

Command:

```bash
npm run verify
```

The unified runner exercises Chrome against a self-contained prefix-aware
server over the production `dist/` and handles process cleanup. Result: exit
0; 243 assertions, 33 route checks, 0 console errors, 0 resource/HTTP failures, 0
failures, and 5 screenshots. The JSON evidence is
`artifacts/browser-qa/report.json`.

### GitHub Pages base-path gate

Commands:

```bash
BASE_PATH=/embodied-frontier SITE_URL=https://example.github.io/embodied-frontier/ npm run verify
```

The built output passed static and bundle checks with
`initialInteractiveGzip: 100377`, both lazy-package flags false, and the
manifest present. The prefix-aware runner served the real production `dist/`
under `/embodied-frontier/`; that run passed with 243 assertions, 33 route
checks, 0 console errors, 0 resource/HTTP failures, and 0 failures.

## Artifacts

- `artifacts/browser-qa/report.json`
- `artifacts/browser-qa/desktop-home.png`
- `artifacts/browser-qa/desktop-graph.png`
- `artifacts/browser-qa/mobile-home.png`
- `artifacts/browser-qa/reduced-motion-home.png`
- `artifacts/browser-qa/reduced-motion-graph.png`

## Limitations

- The unified runner uses the repository’s prefix-aware static server because
  Astro’s stock preview server does not mount a configured `BASE_PATH` as a URL
  prefix. It serves the same production `dist/` bytes and is started/stopped
  inside the verification process.
- External URLs are validated deterministically for scheme and safety, but no
  live internet availability check is performed by CI.
- Browser evidence is local headless Chrome evidence; it does not claim an
  externally deployed GitHub Pages smoke test.
