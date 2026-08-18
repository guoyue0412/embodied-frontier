# Task 10 report: bundle, static, accessibility, and browser gates

## Status

DONE. The complete production verification bundle is implemented in the
isolated worktree and re-run successfully from both the repository root and a
configured GitHub Pages base path.

## Delivered gates

- `scripts/check-bundle-budget.mjs` fails closed when the Astro manifest is
  missing or malformed. It collects every initial `script[type=module][src]`
  and `link[rel=modulepreload]`, follows their static import closure, applies
  the gzip budget, and rejects initial Three.js/Cytoscape leakage. Tests cover
  missing manifests and an oversized preload fixture.
- `scripts/check-static-site.mjs` parses every built HTML document, checks
  landmarks, language, image alternatives, control names, iframe titles, URL
  schemes, internal files/fragments, nested-document relative links, and
  external `_blank` rel safety. The safety check is case-insensitive and has a
  `target="_BLANK"` negative fixture.
- `scripts/browser-qa.mjs` uses real headless Chrome CDP evidence for keyboard
  Tab focus, visible focus rings, Space/Enter activation, pointer activation,
  touch activation, search URL/result updates, no-JS fallbacks, reduced motion,
  HTTP/resource failures, mobile overflow/control sizing, and lazy-package
  network evidence. The mobile home run proves Three.js is not downloaded at
  360px touch width; graph runs prove Cytoscape is not downloaded before the
  explicit load interaction.
- Visual runtime assertions now observe terminal `ready` or explicit
  `fallback` states for DotGrid, GridDistortion, and Embodiment. DotGrid uses
  a QA-only frozen lifecycle, while the Cytoscape graph uses a seeded preset
  layout with animation disabled for repeatable screenshots.
- Navigation creates a fresh per-route/profile capture after the previous
  capture reaches network idle, attributes requests by loader ID, waits for a
  route readiness selector and URL, and resets scroll before screenshots.
  Search waits for the explicit
  `[data-search-controls-ready="true"]` island marker and uses condition-based
  URL/result waits; it does not use DOM `.click()` shortcuts.
- Screenshots wait for fonts/layout readiness and two equal compositor frames;
  the QA-only compositor reflow prevents transient canvas capture. The
  verifier runs a second QA pass on the same server/build and compares a
  normalized report plus every PNG hash with `scripts/compare-browser-qa.mjs`.
- `scripts/verify-production.mjs` runs build, all tests, lint, static checks,
  bundle checks, a prefix-aware production dist server, browser QA, and the
  repeatability comparison. It allocates a safe ephemeral server port,
  waits for `READY`, and awaits graceful then forced process termination. The
  CI workflow invokes the same `npm run verify` command and uploads `dist/`
  and `artifacts/browser-qa/` with `actions/upload-artifact@v4`, including on
  failed verification when files exist.

## TDD and regression evidence

- RED: the initial bundle-budget test failed with `ERR_MODULE_NOT_FOUND` while
  the checker was absent.
- GREEN: the bundle/static/search/graph/repeatability tests pass after the
  checkers and runtime gates were added.
- Regression fixes included route/profile request attribution, mobile-home
  navigation before capture, stable graph layout, search hydration readiness,
  runtime-ready/fallback semantics, nested-relative link resolution, and
  case-insensitive `_blank` safety.

## Exact verification commands and results

### Root production gate

```bash
ASTRO_TELEMETRY_DISABLED=1 npm run verify
```

Result: exit 0. The latest run passed 73/73 Node tests, ESLint, all 14 static
HTML documents, the bundle checker, and production browser QA with 243
assertions, 33 route checks, 0 console errors, 0 resource failures, 0 HTTP
errors, 0 failures, and 5 screenshots. Final bundle evidence was:

```text
initialInteractiveGzip: 100393 bytes
budget: 122880 bytes
sharedIncludesThree: false
sharedIncludesCytoscape: false
manifest: dist/astro-manifest.json
```

The verifier's second same-build QA pass reported:

```text
browser QA repeatability: report 5238184999ad0ced324cedb5f590ad2851b531703189af476ac897b225440055; screenshots 5 identical
```

### GitHub Pages base-path gate (run twice)

```bash
BASE_PATH=/embodied-frontier SITE_URL=https://example.github.io/embodied-frontier/ ASTRO_TELEMETRY_DISABLED=1 npm run verify
```

Both runs exited 0 with 73/73 tests, 243 assertions, 33 route checks, no
console/resource/HTTP failures, and the same normalized repeatability hash:

```text
dba5f5293f3c55d5f6586d23ee166adccc2e85fc3e78bb3b4b45d0a2f174e302
```

The base-path bundle remained within budget (`initialInteractiveGzip: 100425`)
with both lazy-package flags false and a present manifest.

### Focused checks

```bash
node --test tests/*.test.mjs
ASTRO_TELEMETRY_DISABLED=1 npm run lint
git diff --check
```

Results: 73/73 tests passed, lint passed, and the diff had no whitespace
errors. The unified verifier also invokes
`node scripts/compare-browser-qa.mjs` against a second temporary artifact
directory and removes that directory after comparison.

## Committed artifacts

- `artifacts/browser-qa/report.json` (portable route/profile metadata; no
  absolute worktree path, ephemeral port, or timestamp)
- `artifacts/browser-qa/desktop-home.png`
- `artifacts/browser-qa/desktop-graph.png`
- `artifacts/browser-qa/mobile-home.png`
- `artifacts/browser-qa/reduced-motion-home.png`
- `artifacts/browser-qa/reduced-motion-graph.png`

The committed root report has schema version 2, base path `/`, 243 assertions,
33 route checks, and zero failures. Its screenshot SHA-256 values are:

```text
desktop-home.png             f8b440db3b92f73d9babbc9a7bc7034145208d4b8660402740371297dc11b7d8
desktop-graph.png            751ab0b273923c90671325fe1f3eebfdc8557a29489f23c303516dd330dc8c9c
mobile-home.png              5df89caf2497f080428cbd175325c03e0da867bf8715ffd1055661dd886a24f6
reduced-motion-home.png      525ee87ac1a68e30a3eaec21120627b3be2a713bf7c9954a4dd111d8f691e346
reduced-motion-graph.png     751ab0b273923c90671325fe1f3eebfdc8557a29489f23c303516dd330dc8c9c
```

The normalized report hash is the repeatability hash above; the raw committed
`report.json` file SHA-256 is
`1e5e8b6a47a2e58d679b8d7cd2421b3d3b0634f6252c8f758b01e9cbdd1352ae`.

## Limitations

- The verifier uses the repository's prefix-aware static server because
  Astro's stock preview server does not mount a configured `BASE_PATH` as a
  URL prefix. It serves the same production `dist/` bytes and is started and
  stopped inside verification.
- External URLs are checked deterministically for scheme and safety; CI does
  not claim live availability of third-party services.
- Browser evidence is local headless Chrome evidence, not an externally
  deployed GitHub Pages smoke test.
