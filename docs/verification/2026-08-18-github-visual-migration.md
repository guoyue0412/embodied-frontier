# GitHub-first visual migration verification

Date: 2026-08-19  
Review branch: `feat/github-visual-system`  
Evidence source HEAD before this report commit: `4e13f2fbe4f3adcc5ec03420636deb4afcd397bc`  
Base: `main` at `e3e6da014fe74c67b36a97dac1f6257dd67f4f54`  
GitHub remote: `https://github.com/guoyue0412/embodied-frontier.git`

This is a local acceptance and review handoff. No push, pull request, merge,
GitHub Actions run, Pages deployment, or online smoke test was executed by
Task 12.

## 1. Source audit

### Architecture and scope

- The migrated source of truth is Astro static output backed by typed Markdown
  under `src/content/{papers,models,datasets,projects,roadmap}`.
- The public route set is emitted as 14 static pages, including the homepage,
  research indexes, five paper detail pages, comparison pages, graph, roadmap,
  projects, about, and the migration check route.
- React islands are limited to search, hero effects, procedural embodiment,
  evidence/reading controls, and the explicitly activated knowledge graph.
- GitHub workflows, CODEOWNERS, the PR template, deterministic static/bundle
  checks, and the local browser artifact set are included in the reviewed
  migration diff.

### Third-party provenance and license boundaries

- React Bits `Shuffle`, `DotGrid`, and `GridDistortion` are pinned to upstream
  revision `4e0e030193b563be6be33d928f77d0d01cefe237`; the MIT + Commons Clause
  notice and complete license text are recorded in `THIRD_PARTY_NOTICES.md` and
  `src/components/vendor/react-bits/LICENSE.md`.
- `three@0.180.0` and `@types/three@0.180.0` are recorded with their upstream,
  copyright, and MIT provenance. `three` is lazy and excluded from the shared
  initial entry.
- `cytoscape@3.34.1` is recorded as MIT and is dynamically imported only after
  graph activation.
- `gsap@3.15.0` and `@gsap/react@2.1.2` are recorded with the GreenSock
  standard-license URL and are used through the vendored React Bits variants.
- `public/hero-static.webp` is documented as first-party artwork. Its SHA-256
  is `09df95ec29889453ce74223fb232ee930b7b6b040f045be507ee8497edd229f7`.

### Reference-site and artifact audit

The required command was run:

```text
rg -n "ZhuYun97|embodied-ai-learning|hero-bg\.jpg|model\.glb" src public THIRD_PARTY_NOTICES.md
```

Result: no matches. Reference-site discussion remains only in the design and
provenance documentation, not in runtime source, public assets, or the
third-party notice boundary. No `hero-bg.jpg`, `model.glb`, copied reference
asset, or reference-site runtime source was found.

Additional audit results:

- `npm ls --all`: exit 0. The tree contains no missing required dependency;
  npm reports only platform/optional dependencies as `UNMET OPTIONAL`.
- A targeted diff scan found no concrete API key, credential, private key, or
  secret value. Matches were policy prose, CI permission names, or dependency
  metadata only.
- `git ls-files` contains no `dist/`, `node_modules/`, `.astro/`, `.wrangler/`,
  coverage, environment, log, source-map, or archive build output. The tracked
  browser screenshots/report and first-party hero asset are intentional review
  evidence.
- Before adding this report, `git diff main...HEAD --stat` reported 172 changed
  files, 21,736 insertions, and 6,747 deletions. The changed set is the
  research-station migration, its tests/CI, provenance, and review evidence;
  no unrelated application or credential files are present.
- `git diff --check main...HEAD`: exit 0 with no whitespace errors.

## 2. Build verification

### Clean-room commands

```text
npm ci
npm run verify
```

`npm ci` completed successfully from the lockfile (`added 703 packages`); npm
printed only pending optional install-script approval warnings for `esbuild`,
`fsevents`, and `sharp`.

The first unprivileged `npm run verify` reached all deterministic checks but
could not bind the local browser-QA server (`listen EPERM` on
`127.0.0.1`). The exact same gate was rerun with local-listening permission and
passed. This was an environment boundary, not a project assertion failure.

### Fresh gate evidence

- Content build: **PASS** — 5 papers, 3 roadmap stages, 3 projects, 3 models,
  3 datasets; search index 5 papers; graph 11 nodes and 16 edges.
- Astro production build: **PASS** — 14 static pages.
- Full test suite: **PASS** — 84 passed, 0 failed, 0 cancelled, 0 skipped.
- ESLint: **PASS** — exit 0.
- Static-site checker: **PASS** — 14 files, 0 errors.
- Bundle checker: **PASS** — initial interactive gzip `100459` bytes against
  the `122880` byte budget; `sharedIncludesThree: false` and
  `sharedIncludesCytoscape: false`.
- Production verification conclusion: `verify: production build, static,
  bundle, lint, tests, and browser QA passed`.

The bundle report recorded Three.js and Cytoscape as non-initial assets; the
initial entries were the search, hero, graph shell, reading controls, and
shared client entries.

## 3. Browser verification

### Exact standalone production command

The required standalone sequence was run against a clean preview server:

```text
npm run preview -- --host 127.0.0.1
npm run qa:browser -- --base-url http://127.0.0.1:4321
```

The preview served on `http://127.0.0.1:4321`; the browser command exited 0.
The script's base URL is supplied by its default `SITE_URL` when the CLI flag
is present, and the report records `siteBasePath: "/"`.

### Profiles and assertions

- Desktop: 1440×900, mouse/pointer capability.
- Mobile touch: 360×800, touch capability.
- Desktop reduced-motion: 1440×900 with
  `prefers-reduced-motion: reduce`.
- Additional no-JavaScript checks covered the paper list and relationship list.
- 33 route checks and 246 assertions: **246 passed, 0 failed**.
- Browser `consoleErrors`: **0**; resource failures: **0**; HTTP errors:
  **0**; report `failures`: **0**.
- Search URL synchronization returned `2 / 5` results for the tested Chinese
  query; graph activation passed with keyboard Space and Enter, and with touch
  activation.
- Mobile routes had no horizontal overflow, all visible controls met 44×44 px,
  and no Three.js request was observed on the narrow/touch profile.
- Cytoscape was absent before explicit graph activation and requested only
  after activation.
- Reduced-motion kept the static hero visible, hid the motion-only layer, and
  reported zero continuous animations while leaving reading and graph tools
  usable.
- No-JavaScript paper and graph fallbacks remained visible and complete.

### Screenshot evidence and visual review

The report and screenshots are tracked under `artifacts/browser-qa/`:

- `desktop-home.png` — 1440×900 homepage.
- `desktop-graph.png` — 1440×900 graph entry after activation.
- `mobile-home.png` — 360×800 touch homepage.
- `reduced-motion-home.png` — 1440×900 reduced-motion homepage.
- `reduced-motion-graph.png` — 1440×900 reduced-motion graph entry.
- `report.json` — machine-readable route, assertion, console, network, and
  screenshot evidence.

Screenshots were visually inspected. The dark-space grid, hero hierarchy,
navigation, graph controls, touch layout, and reduced-motion static treatment
are readable; no obvious clipping or horizontal overflow is visible. The graph
screenshots show the expected vertical scrollbar and a viewport crop of the
scrollable graph body, not a layout overflow.

Remaining visual risk: the QA browser runs headless Chrome with
`--disable-gpu`, so the successful GPU/WebGL rendering path is not a visual
claim here. The deterministic fallback path was exercised and passed
(`distortionState: fallback`, `embodimentState: fallback-error`), and the
static hero remained available. A manual review on a normal GPU-enabled
browser is still required before merge/deploy.

## 4. Deployment status

These fields intentionally remain unexecuted; local build and browser evidence
do not constitute remote deployment evidence.

| Evidence | Status |
| --- | --- |
| GitHub remote | exists: `https://github.com/guoyue0412/embodied-frontier.git` |
| Push of `feat/github-visual-system` | **not executed** |
| Pull request URL | **not executed** |
| GitHub Actions URL / PR check | **not executed** |
| GitHub Pages URL / deployment | **not executed** |
| Online smoke test | **not executed** |
| Merge to `main` | **not executed** |

The proposed PR handoff is:

### Proposed PR title

```text
feat: migrate research station to GitHub-first visual architecture
```

### Proposed PR body

```markdown
## Summary

- Migrate the research station to Astro static output backed by typed repository Markdown.
- Add licensed React visual islands, evidence-aware reading/comparison tools, and an explicit graph fallback.
- Add deterministic build, accessibility, link, bundle, browser, PR, and GitHub Pages workflow gates.

## Verification

- `npm ci` — passed from lockfile.
- `npm run verify` — passed: 84/84 tests, lint, 14-page static check, 100459-byte initial interactive gzip, and browser QA.
- Standalone preview + `npm run qa:browser -- --base-url http://127.0.0.1:4321` — passed: 246/246 assertions, 0 console errors, 0 resource/HTTP errors.
- Screenshots: `artifacts/browser-qa/{desktop-home,desktop-graph,mobile-home,reduced-motion-home,reduced-motion-graph}.png`.

## Review requirements

- [ ] Human review of source links, evidence states, protocol boundaries, and content claims.
- [ ] Human review of third-party provenance/licenses and first-party asset ownership.
- [ ] Human review of desktop GPU/WebGL visuals and mobile/reduced-motion fallbacks.
- [ ] Confirm required `verify` status check passes on GitHub.
- [ ] Confirm deployment impact and Pages settings before merge.

## Deployment

No push, PR, merge, Pages deployment, or online smoke test was performed by this local acceptance task.
Only after manual review and passing required checks should the branch be pushed and a PR opened; merge to `main` remains a separate human-controlled action.
```

### Manual review gate

Do not merge or deploy based solely on this local report. Before any remote
action, a human reviewer must inspect the factual sources and evidence states,
license notices, the GPU-enabled visual path, mobile/reduced-motion behavior,
the complete `main...HEAD` diff, and the GitHub workflow results. After review,
the root agent may push and open the proposed PR; merge and Pages deployment
remain manual and are not authorized by this Task 12 acceptance.
