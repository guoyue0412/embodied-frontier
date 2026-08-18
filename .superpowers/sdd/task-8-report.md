# Task 8 Report: optional Cytoscape knowledge-graph island

## Status

DONE. The optional graph island is implemented and committed in the task
worktree. The static relationship list remains the canonical, complete
fallback and Cytoscape is only reachable after an explicit user click.

## Delivered

- Moved `lib/graph-core.mjs` and `lib/graph-core.d.mts` into `src/lib/`, then
  updated the graph compiler, query layer, tests, and static relationship list
  imports.
- Added `KnowledgeGraph.tsx` as a server-rendered shell with an explicit
  `加载交互图谱` control. The shell dynamically imports `KnowledgeMap.tsx`
  only after activation; Cytoscape is dynamically imported by the map and is
  absent from the initial graph page asset requests.
- Added `KnowledgeMap.tsx` with repository-generated nodes/edges, labeled node
  search, research-direction cluster filter, visible graph labels, keyboard
  node navigation, selected-node neighbor highlighting, relationship path
  links, reduced-motion layout behavior, and Cytoscape cleanup on unmount.
- Added mobile-first graph styling: 44 px controls, visible focus inherited
  from the shared shell, high-contrast labels, 520 px desktop and 420 px
  mobile canvas minimum heights, and no hover-only information.
- Added initialization/import failure fallback that leaves the complete static
  relationship list available and permits a retry.
- Added `cytoscape@3.34.1` and recorded its repository, copyright, MIT license,
  package version, and local consumer in `THIRD_PARTY_NOTICES.md`.
- Extended `tests/knowledge-graph.test.mjs` with complete-list, explicit-load,
  and no-initial-Cytoscape assertions.

## TDD evidence

- RED: after extending the graph test, `ASTRO_TELEMETRY_DISABLED=1 npm run
  build && node --test tests/knowledge-graph.test.mjs` failed because the
  static page had neither `完整关系清单` nor `加载交互图谱`.
- GREEN: the focused graph test passes after the island implementation.

## Verification evidence

- `ASTRO_TELEMETRY_DISABLED=1 npm test`: passed, 52/52 tests.
- `ASTRO_TELEMETRY_DISABLED=1 npm run lint`: passed with exit code 0.
- `ASTRO_TELEMETRY_DISABLED=1 npm run content:validate`: passed with 0
  diagnostics errors; existing Astro deprecation notices/hints remain.
- `ASTRO_TELEMETRY_DISABLED=1 BASE_PATH=/embodied-frontier/ SITE_URL=https://example.github.io/embodied-frontier/ npm run build && ASTRO_TELEMETRY_DISABLED=1 BASE_PATH=/embodied-frontier/ SITE_URL=https://example.github.io/embodied-frontier/ node --test tests/astro-shell.test.mjs tests/knowledge-graph.test.mjs tests/rendered-html.test.mjs`: passed, 12/12 tests; base-prefixed routes and graph links remain valid.
- Final root `ASTRO_TELEMETRY_DISABLED=1 npm run build`: passed, 14 pages.
- Final static checks: `dist/graph/index.html` contains `完整关系清单` and
  `加载交互图谱`, contains no `cytoscape*.js` reference, and
  `git diff --check` passed.
- Final graph assets are split into `KnowledgeGraph` (about 2.0 KB), lazy
  `KnowledgeMap` (about 6.2 KB), and lazy `cytoscape.esm` (about 425 KB); the
  graph HTML only references the shell island entry, not Cytoscape.

## Verification limit

No real browser session was run in this sandbox, so device-level pointer/touch
rendering and request capture remain appropriate follow-up CI/browser-QA work.
