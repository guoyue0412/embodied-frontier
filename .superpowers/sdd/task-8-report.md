# Task 8 report: optional Cytoscape knowledge-graph island

## Status

DONE. The optional Cytoscape island is implemented in the isolated worktree;
the generated static relationship list remains the complete, repository-only
fallback. Cytoscape is reachable only after the explicit `加载交互图谱`
activation.

## Delivered

- Added a shared `getBasePath` / `withBase` contract. Astro passes the built
  `BASE_URL` into the graph island, and graph node navigation uses that same
  value instead of a deployment-slug constant. The browser QA route joiner
  also accepts a base URL with a path prefix.
- Added `KnowledgeGraph`'s explicit loading/error shell and kept both island
  and Cytoscape imports lazy. The initial graph HTML has no Cytoscape script
  reference; a failed import or instance creation leaves the full static list
  available and offers retry.
- Added a small state synchronizer that buffers the latest filter and selected
  node while the Cytoscape chunk loads, replays it exactly once when ready, and
  ignores updates after disposal. Instance destruction and async cancellation
  are guarded on unmount.
- Updated `KnowledgeMap` selectors and browser QA to exercise the real map:
  node navigation buttons, keyboard Space selection, nonzero nodes, nonzero
  path links, and base-prefixed path hrefs. The visible control is named
  `研究方向分组` because the heterogeneous metadata is a grouping, not a
  claim of strict clustering.
- Added stable `model-<slug>` and `dataset-<slug>` hash ids to comparison rows
  plus matching `data-comparison-anchor` markers on both desktop rows and
  mobile cards. A breakpoint-safe inline handler selects the visible marker,
  focuses it, and scrolls it into view; the DOM keeps exactly one hash id.
- Extended 360px browser QA to activate the graph, verify all 13 map controls
  are at least 44px tall, and follow both model and dataset path links to a
  focused, in-viewport mobile card.
- Added focused regression coverage for the configured base, browser selectors,
  delayed-state replay/disposal, stable anchors, static fallback, and explicit
  graph data determinism/dangling-relation rejection.

## TDD evidence

- RED: the newly added focused regressions initially failed for the missing
  base serialization, runtime synchronizer, selector contract, and comparison
  anchors.
- GREEN: after implementation,
  `ASTRO_TELEMETRY_DISABLED=1 BASE_PATH=/embodied-frontier/ SITE_URL=https://example.github.io/embodied-frontier/ node --test tests/astro-shell.test.mjs tests/knowledge-graph.test.mjs tests/rendered-html.test.mjs`
  passed 16/16.

## Final verification

- `ASTRO_TELEMETRY_DISABLED=1 npm test` — 56/56 tests passed; 14 pages built.
- `npm run lint` — passed, exit code 0.
- `ASTRO_TELEMETRY_DISABLED=1 npm run content:validate` — 0 diagnostics
  errors; existing Astro deprecation/hint output remains.
- `ASTRO_TELEMETRY_DISABLED=1 BASE_PATH=/embodied-frontier/ SITE_URL=https://example.github.io/embodied-frontier/ npm run build` — non-root
  build passed; 14 pages generated.
- The updated `scripts/browser-qa.mjs` ran against the generated non-root
  `dist` through a temporary prefix-aware localhost static server:
  desktop/mobile 20 route checks passed with no overflow or page errors;
  search produced `2 / 5 篇匹配`; desktop graph interaction produced 11
  nodes, 4 path links, selected `paper:openvla`, focused keyboard state, and
  `/embodied-frontier/papers/openvla/` path href. At 360px, graph activation
  produced 11 nodes and 13 controls with a 44px minimum height; model and
  dataset paths focused visible `ARTICLE` targets in the viewport. Failures
  were empty.
- `git diff --check` — passed. The final bundle check showed
  `KnowledgeGraph` 2,069 bytes, lazy `KnowledgeMap` 6,677 bytes, and lazy
  `cytoscape.esm` 435,576 bytes; the graph HTML had no
  `src="...cytoscape...js"` reference.

## Evidence boundary

All graph nodes and edges come from the generated repository graph data and
explicit Markdown relations. No runtime research API, keyword inference, or
external relationship source is used.
