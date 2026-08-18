# Task 9 report: reading tools and evidence-aware comparison visuals

## Status

DONE. Task 9 is implemented in the isolated worktree. Repository Markdown
remains the only research fact source; the new controls only operate on the
compiled records and article evidence states.

## Delivered

- Added `src/lib/comparison-core.mjs` with protocol/unit-aware
  `canRankFields`, protocol-key helpers, and a compatibility-preserving
  `compareMetric`. The existing `lib/comparison-core.mjs` is a thin re-export
  for older test/tool imports while the application imports the `src/lib`
  implementation.
- Added `ProtocolLock.astro`. Mixed model protocols visibly render
  `协议一致性锁：不可排序` with the exact protocol-key mismatch; compatible
  dataset protocols render a positive field-check state.
- Updated `ComparisonTable.astro` to expose sorting only when every selected
  numeric field has enough values and a shared protocol/unit. Model fields
  remain unranked because their protocols differ, including fields where only
  a matching subset has numeric values. Dataset controls sort both table rows
  and mobile cards, with missing values last.
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

- RED: `ASTRO_TELEMETRY_DISABLED=1 npm run build && node --test tests/reading-and-comparison.test.mjs`
  failed all four new tests before the protocol lock, reading islands, and
  `src/lib/comparison-core.mjs` existed.
- GREEN: the same focused build/test command passed 8/8 after implementation.

## Final verification

- `ASTRO_TELEMETRY_DISABLED=1 npm test` — 60/60 tests passed; 14 pages built.
- `npm run lint` — passed, exit code 0.
- `ASTRO_TELEMETRY_DISABLED=1 npm run content:validate` — 0 errors; existing
  Astro deprecation/hint diagnostics remain.
- `BASE_PATH=/embodied-frontier ASTRO_TELEMETRY_DISABLED=1 npm run build && BASE_PATH=/embodied-frontier node --test tests/astro-shell.test.mjs tests/reading-and-comparison.test.mjs` — 7/7 passed; non-root links and reading output were preserved.
- `git diff --check` — passed.
- Focused headless browser check against the production preview passed:
  paper controls rendered with all three labels; lens persisted `verified`,
  article prose stayed visible, and instant scroll updated progress to 100;
  model pages showed the protocol lock and 0 sort controls; dataset sorting
  changed table order; mobile had no horizontal overflow and 44px lens
  controls; reduced motion matched and progress transition was `0.00001s`.
- Emitted assets remained dependency-light: `ReadingProgress` 1,387 bytes,
  `EvidenceLens` 1,392 bytes, with no Three.js/Cytoscape references in either
  island chunk. No package or dependency changes were required.

## Limitations and evidence boundary

- The repository’s existing `scripts/browser-qa.mjs` could not reach its later
  assertions in this managed environment: its pre-existing search step calls
  the input value setter with a null target and Chrome reports `Illegal
  invocation`. The dedicated Task 9 browser check above avoided that unrelated
  failure and directly exercised the new controls.
- Reading progress intentionally tracks the article/page scroll range and
  uses no analytics or network persistence. Lens preference is local-only and
  is discarded gracefully when browser storage is unavailable.
