# Task 10 report: bundle, static, accessibility, and browser gates

## Status

DONE. The complete production verification bundle is implemented in the
isolated worktree and re-run successfully from both the repository root and a
configured GitHub Pages base path.

## Delivered gates

- `scripts/check-bundle-budget.mjs` fails closed when the Astro manifest is
  missing, malformed, or references an absent manifest/disk asset. It collects
  every initial `script[type=module][src]` and
  `link[rel=modulepreload]`, follows their static import closure, applies the
  gzip budget, and rejects initial Three.js/Cytoscape leakage. Tests cover
  missing manifests, oversized preloads, ghost manifest imports, and ghost
  static imports.
- `scripts/check-static-site.mjs` parses every built HTML document, checks
  landmarks, language, image alternatives, control names, iframe titles, URL
  schemes, internal files/fragments, nested-document relative links, and
  external `_blank` rel safety. The safety check tokenizes HTML whitespace,
  compares exact case-insensitive `noopener`/`noreferrer` tokens, and rejects
  near-misses such as `noopener-evil` and `noopener,`; fixtures cover all of
  these cases.
- `scripts/browser-qa.mjs` uses real headless Chrome CDP evidence for keyboard
  Tab focus, visible focus rings, Space/Enter activation, pointer activation,
  touch activation, search URL/result updates, no-JS fallbacks, reduced motion,
  HTTP/resource failures, mobile overflow/control sizing, and lazy-package
  network evidence. The mobile home run proves Three.js is not downloaded at
  360px touch width; graph runs prove Cytoscape is not downloaded before the
  explicit load interaction.
- Visual runtime assertions now observe terminal `ready` or explicit
  `fallback` states for DotGrid, GridDistortion, and Embodiment. HeroExperience
  first evaluates capabilities and exposes `initializing`, `enhanced`, or
  `capability-fallback`; headless/no-fine-pointer runs require the static hero
  plus terminal Embodiment, while enhanced runs require both optional visual
  runtimes. DotGrid uses a QA-only frozen lifecycle, while the Cytoscape graph
  uses a seeded preset layout with animation disabled for repeatable screenshots.
- Navigation creates a fresh per-route/profile capture after the previous
  capture reaches network idle, attributes requests by loader ID, waits for a
  route readiness selector and URL, and resets scroll before screenshots.
  KnowledgeGraph exposes an explicit
  `data-knowledge-graph-controls-ready="true"` marker only after hydration and
  listeners exist; graph activation waits for it and for the map-ready marker.
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
  runtime-ready/fallback semantics, explicit headless capability fallback,
  nested-relative link resolution, and case-insensitive `_blank` safety.

## Exact verification commands and results

### Root production gate

```bash
ASTRO_TELEMETRY_DISABLED=1 npm run verify
```

Result: exit 0. The latest run passed 99/99 Node tests, ESLint, all 14 static
HTML documents, the bundle checker, and production browser QA with 252
assertions, 33 route checks, 0 console errors, 0 resource failures, 0 HTTP
errors, 0 failures, and 5 screenshots. Final bundle evidence was:

```text
initialInteractiveGzip: 100516 bytes
budget: 122880 bytes
sharedIncludesThree: false
sharedIncludesCytoscape: false
manifest: dist/astro-manifest.json
```

The verifier's second same-build QA pass reported:

```text
browser QA repeatability: report f5e8f505a0434c281deffb5ddc01ad7ae0d30777d15c3bcbb56737523032db1f; screenshots 5 identical
```

### GitHub Pages base-path gate (three consecutive runs before this targeted fix)

```bash
BASE_PATH=/embodied-frontier SITE_URL=https://example.github.io/embodied-frontier/ ASTRO_TELEMETRY_DISABLED=1 npm run verify
```

Those three runs exited 0 with 76/76 tests, 246 assertions, 33 route checks, no
console/resource/HTTP failures, and the same normalized repeatability hash:

```text
dff95df6c2fc0f377ff382165bc7684fce2359007858127a29c72a44be32c643
```

The base-path bundle remained within budget (`initialInteractiveGzip: 100490`)
with both lazy-package flags false and a present manifest.

This targeted capability-state fix was verified with the root production gate
above; the base-path command was not rerun in this final CI-failure fix turn.

### Focused checks

```bash
node --test tests/*.test.mjs
ASTRO_TELEMETRY_DISABLED=1 npm run lint
git diff --check
```

Results: 99/99 tests passed, lint passed, and the diff had no whitespace
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

The committed root report has schema version 2, base path `/`, 252 assertions,
33 route checks, and zero failures. Its screenshot SHA-256 values are:

```text
desktop-home.png             1e3ce97a57d4b48627f744f2cb48fa83f46973aada71dacc2fd26903a5565971
desktop-graph.png            a727942c30db521b09fcae9105af3b5d2dff2310ad9009230c3da8cd4f9cfacc
mobile-home.png              5df89caf2497f080428cbd175325c03e0da867bf8715ffd1055661dd886a24f6
reduced-motion-home.png      525ee87ac1a68e30a3eaec21120627b3be2a713bf7c9954a4dd111d8f691e346
reduced-motion-graph.png     a727942c30db521b09fcae9105af3b5d2dff2310ad9009230c3da8cd4f9cfacc
```

The normalized report hash is the repeatability hash above; the raw committed
`report.json` file SHA-256 is
`85d7eb8ce9fe4c0e8a84068d94590be0c6eec9af42b4a4b203e0e56f9389bde3`.

The compared report deliberately omits wall-clock timestamps. Route/profile,
viewport, touch/reduced-motion settings, network evidence, assertions, and
screenshot metadata are retained and normalized; adding a timestamp would
make the repeatability evidence nondeterministic without strengthening the
gate.

## Limitations

- The verifier uses the repository's prefix-aware static server because
  Astro's stock preview server does not mount a configured `BASE_PATH` as a
  URL prefix. It serves the same production `dist/` bytes and is started and
  stopped inside verification.
- External URLs are checked deterministically for scheme and safety; CI does
  not claim live availability of third-party services.
- Browser evidence is local headless Chrome evidence, not an externally
  deployed GitHub Pages smoke test.
