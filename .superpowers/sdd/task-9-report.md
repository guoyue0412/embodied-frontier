# Task 9 report: reading tools and evidence-aware comparison visuals

## Status

DONE. Task 9 is implemented in the isolated worktree. Repository Markdown
remains the only research fact source; the new controls only operate on the
compiled records and article evidence states.

## Delivered

- Added `src/lib/comparison-core.mjs` with a shared conservative comparison
  gate. It validates the complete candidate set—including null/non-numeric
  records—before numeric filtering, and requires one explicit field identity,
  protocol key, and unit. `canRankFields`, `compareMetric`, and the table’s
  rankability path all use that gate; missing or incompatible metadata yields
  no sorting affordance and an explicit reason. The existing
  `lib/comparison-core.mjs` is a thin re-export for older test/tool imports
  while the application imports the `src/lib` implementation.
- Added `ProtocolLock.astro`. Mixed model protocols visibly render
  `协议一致性锁：不可排序` with the exact protocol-key mismatch; compatible
  dataset protocols render a positive field-check state.
- Updated `ComparisonTable.astro` to expose sorting only when every compared
  record has the same field identity, protocol, and unit, and at least two
  values are numeric. Model fields remain unranked because their protocols
  differ, including fields where only a matching subset has numeric values;
  missing values stay `暂无可靠值`. Dataset controls sort both table rows and
  mobile cards, with missing values last. `ProtocolLock.astro` receives the
  same full-set protocol compatibility result and preserves the reason text.
- Added `ReadingProgress.tsx`: server-rendered progress semantics, one passive
  scroll listener throttled by `requestAnimationFrame`, and cleanup of both
  the listener and pending frame.
- Added `EvidenceLens.tsx`: keyboard-accessible `全部证据`、`突出已核验`、
  `突出待核` buttons. The selected mode is stored only in localStorage under
  the current pathname, with storage failure fallback. It changes an article
  data attribute and reduces non-selected badge opacity; it never hides prose,
  headings, figures, source links, or table rows.
- Integrated both reading islands into generated paper pages while retaining
  static prose and base-path-safe links. Added responsive/reduced-motion CSS
  and updated the rendered-paper regression to allow Astro’s required island
  runtime while still rejecting scripts/event handlers in sanitized prose.

## TDD evidence

- RED: the review regression first failed on a missing-unit candidate and the
  browser QA source contract before the conservative gate and route repair
  were applied.
- GREEN: `node --test tests/reading-and-comparison.test.mjs
  tests/comparison-content.test.mjs` passed 9/9 after the review fixes.

## Final verification

- `ASTRO_TELEMETRY_DISABLED=1 npm test` — 61/61 tests passed; 14 pages built.
- `npm run lint` — passed, exit code 0.
- `ASTRO_TELEMETRY_DISABLED=1 npm run content:validate` — 0 errors; existing
  Astro deprecation/hint diagnostics remain.
- `BASE_PATH=/embodied-frontier ASTRO_TELEMETRY_DISABLED=1 npm run build && BASE_PATH=/embodied-frontier node --test tests/astro-shell.test.mjs tests/reading-and-comparison.test.mjs` — 8/8 passed; non-root links, trailing-slash routes, and reading output were preserved.
- `git diff --check` — passed.
- `SITE_URL=http://127.0.0.1:4335/embodied-frontier/ node scripts/browser-qa.mjs`
  against the real `astro preview` — passed with 0 failures across 20 route /
  viewport checks. The canonical script now normalizes every route to
  `trailingSlash: "always"`, reports missing search/reading controls with
  descriptive assertions, and directly checks paper progress/lens behavior:
  lens `verified`, prose visible, progress `100`, and 213 characters of body
  text. It also passed keyboard skip-link, reduced-motion, graph, anchor,
  mobile overflow, and touch-target checks.
- Emitted assets remained dependency-light: `ReadingProgress` 1,419 bytes,
  `EvidenceLens` 1,392 bytes, with no Three.js/Cytoscape references in either
  island chunk. No package or dependency changes were required.

## Limitations and evidence boundary

- Reading progress intentionally tracks the article/page scroll range and
  uses no analytics or network persistence. Lens preference is local-only and
  is discarded gracefully when browser storage is unavailable.
- Browser QA was run against a real local production preview at a non-root
  base; the preview process was stopped after the check. The report does not
  claim external GitHub Pages hosting or remote browser coverage.
