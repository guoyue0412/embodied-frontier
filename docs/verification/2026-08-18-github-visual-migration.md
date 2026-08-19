# GitHub-first visual migration verification

Date: 2026-08-19

Review branch: `feat/github-visual-system`

Evidence source HEAD before this report commit: `dfd8388` (`fix: complete paper media accessibility fallbacks`)

Base: `origin/main` / `main` at `e3e6da014fe74c67b36a97dac1f6257dd67f4f54`

GitHub remote: `https://github.com/guoyue0412/embodied-frontier.git`

This is local acceptance and review evidence. Task 12 did not push, create a
pull request, merge, run GitHub Actions, deploy Pages, or perform an online
smoke test.

## 1. Source audit

The site is an Astro static build backed by typed Markdown in
`src/content/{papers,models,datasets,projects,roadmap}`. The public output is
14 static pages: the homepage, about, papers index, five paper detail pages,
models, datasets, graph, roadmap, projects, and migration check. React islands
remain limited to explicitly scoped search, reading, visual, and graph
enhancements; static HTML and no-JavaScript fallbacks remain the source of
usable content.

This acceptance pass closed the remaining review findings:

- Paper Markdown now safely renders HTTP(S) figures with alt/title/source
  metadata, a native-dialog lightbox with keyboard close, and visible Mermaid
  and formula fallbacks. Fenced Mermaid/math blocks use deterministic
  `title`, `description`/`alt`, and optional HTTP(S) `source` info attributes;
  inline `$...$` and standard `\(...\)` formulas support the same metadata via
  a `{#formula ...}` annotation. Missing field metadata falls back to the
  first validated paper record source, while missing record context remains
  visibly `来源未提供`. The sanitizer preserves `role="math"` and
  `aria-label`, rejects unsafe schemes, and the lightbox is progressive
  enhancement only; legacy browsers retain the original link. A representative
  test fixture is test-only and contains no paper claim or copied asset.
- Comparison metadata and facts expose field/record provenance disclosures and
  an explicit missing reason. Field-level source values come only from the
  existing record facts; metadata without a field source is honestly labeled
  record-level rather than field-verified. The protocol lock and mobile/desktop
  disclosure markup remain present.
- Knowledge graph research tracks are deterministic clusters with explicit
  compound Cytoscape regions, deterministic positions, keyboard/path behavior,
  click-only loading, and the complete static relationship fallback.
- Research-track cards add a fine-pointer spotlight/depth effect with touch and
  reduced-motion fallbacks. Verify artifact uploads run with `if: always()`,
  and Pages build receives `PUBLIC_REPOSITORY_URL` from ${{ github.repository }}.
  Browser QA now waits for graph readiness/node/path conditions before mouse
  activation, with a keyboard fallback for non-ready desktop mouse paths.

Third-party provenance and license boundaries remain unchanged: vendored React
Bits `Shuffle`, `DotGrid`, and `GridDistortion` are pinned to upstream
revision `4e0e030193b563be6be33d928f77d0d01cefe237` with MIT + Commons Clause
notice; `three@0.180.0`, `@types/three@0.180.0`, `cytoscape@3.34.1`,
`gsap@3.15.0`, and `@gsap/react@2.1.2` have recorded
upstream/version/copyright/license notices. No new dependency was added by
this acceptance pass, so license notices did not require changes.

The required source scan was run:

```text
rg -n "ZhuYun97|embodied-ai-learning|hero-bg\\.jpg|model\\.glb" src public THIRD_PARTY_NOTICES.md
```

Result: no matches (exit 1). No copied reference asset, `hero-bg.jpg`,
`model.glb`, credential, API key, private key, or runtime research API was
found. `npm ls --all` exited 0. `git ls-files` contains no `dist/`,
`node_modules/`, `.astro/`, `.wrangler/`, coverage, environment, log,
source map, or archive build output. The tracked browser screenshots/report
and first-party `public/hero-static.webp` are intentional review evidence.

Before this report commit, `git diff origin/main..HEAD --stat` reported:

```text
179 files changed, 22894 insertions(+), 6783 deletions(-)
```

The changed set is the research-station migration, its tests/CI, provenance,
review artifacts, and the final acceptance fixes. `git diff --check` passed
with no whitespace errors.

## 2. Build verification

The clean-room gate was run exactly as required:

```bash
npm ci
npm run verify
```

`npm ci` exited 0 and installed 703 packages from the lockfile. npm reported
only pending optional install-script approval warnings for `esbuild`,
`fsevents`, and `sharp`.

The final root-path verifier exited 0 with `BASE_PATH=/ SITE_URL=https://example.github.io npm run verify`:

- Content build: **PASS** — 5 papers, 3 roadmap stages, 3 projects, 3
  models, 3 datasets; search index 5 papers; graph 11 nodes and 16 edges.
- Astro production build: **PASS** — 14 static pages.
- Node tests: **PASS** — 95 passed, 0 failed, 0 cancelled, 0 skipped.
- ESLint: **PASS** — exit 0.
- Static-site checker: **PASS** — 14 files, 0 errors.
- Bundle checker: **PASS** — initial interactive gzip `100442` bytes against
  the `122880` byte budget; `sharedIncludesThree: false`,
  `sharedIncludesCytoscape: false`; Cytoscape, Three.js, and the lightbox
  remain non-initial/lazy assets.
- Production verifier: **PASS** — browser report failures 0 and repeatability
  reported `3e8a55eed6fc54a73e3ae2b95c68e7e47c0469bbd8dd24d1954605d131043731`
  with 5 identical screenshots.

The final GitHub Pages non-root verifier also exited 0 with
`BASE_PATH=/embodied-frontier SITE_URL=https://example.github.io/embodied-frontier npm run verify`:

- Astro/static output: **PASS** — 14 pages under `/embodied-frontier/`.
- Node tests: **PASS** — 95 passed, 0 failed.
- Static-site checker: **PASS** — 14 files, 0 errors.
- Bundle checker: **PASS** — initial interactive gzip `100480` bytes against
  the `122880` byte budget; `sharedIncludesThree: false`,
  `sharedIncludesCytoscape: false`.
- Production verifier: **PASS** — browser report failures 0 and repeatability
  reported `f5d40e641b9b96430f2df0d5330b4eefb15e1b5db393a65cbf6d15cd101a2ac3`
  with 5 identical screenshots; all recorded internal requests carried the
  `/embodied-frontier/` prefix.

## 3. Browser verification

The required standalone production sequence from the preceding acceptance
pass was also run:

```bash
npm run preview -- --host 127.0.0.1
npm run qa:browser -- --base-url http://127.0.0.1:4321
```

The preview served on `http://127.0.0.1:4321`; the browser command exited 0.
The final `artifacts/browser-qa/report.json` records:

- Desktop: 1440×900, mouse/pointer capability.
- Mobile touch: 360×800, touch capability.
- Desktop reduced-motion: 1440×900 with
  `prefers-reduced-motion: reduce`.
- Additional no-JavaScript checks for paper and graph fallbacks.
- 33 route checks and **252 passed assertions, 0 failures** in the final root
  report; the non-root report has the same counts.
- `consoleErrors`: **0**; resource failures: **0**; HTTP errors: **0**.
- Search URL synchronization returned 2/5 results for the tested Chinese query.
- Graph activation passed after readiness waits, with 11 nodes and 4 path
  entries; Cytoscape was requested only after explicit activation.
- Mobile had no horizontal overflow, all visible controls met 44×44 px, and
  no Three.js request was observed on the narrow/touch profile.
- Reduced-motion kept the static hero and graph usable with no motion-only
  requirement; no-JavaScript paper and graph fallbacks remained complete.

Tracked screenshots were visually inspected after the final gate. The dark
grid/hero hierarchy, navigation, mobile composition, graph grouping controls,
and reduced-motion static treatment were readable with no obvious clipping or
horizontal overflow. The graph screenshot is a viewport crop of the scrollable
graph body, not layout overflow. Headless Chrome runs with `--disable-gpu`,
so GPU/WebGL quality still requires manual review on a normal GPU-enabled
browser; the deterministic fallback path was exercised and passed.

Screenshot SHA-256 evidence:

```text
desktop-home.png          1e3ce97a57d4b48627f744f2cb48fa83f46973aada71dacc2fd26903a5565971
desktop-graph.png         a727942c30db521b09fcae9105af3b5d2dff2310ad9009230c3da8cd4f9cfacc
mobile-home.png           5df89caf2497f080428cbd175325c03e0da867bf8715ffd1055661dd886a24f6
reduced-motion-home.png   525ee87ac1a68e30a3eaec21120627b3be2a713bf7c9954a4dd111d8f691e346
reduced-motion-graph.png  a727942c30db521b09fcae9105af3b5d2dff2310ad9009230c3da8cd4f9cfacc
report.json               b09a10803b77b77cb7618ee45f0030f09b58e68c5140e2eb7e090dae90291df1
```

## 4. Deployment status

These are intentionally not executed by this task:

| Evidence | Status |
| --- | --- |
| GitHub remote | exists: `https://github.com/guoyue0412/embodied-frontier.git` |
| Push of `feat/github-visual-system` | **not executed** |
| Pull request URL | **not executed** |
| GitHub Actions URL / PR check | **not executed** |
| GitHub Pages URL / deployment | **not executed** |
| Online smoke test | **not executed** |
| Merge to `main` | **not executed** |

### Proposed PR title

```text
feat: migrate research station to GitHub-first visual architecture
```

### Proposed PR body

```markdown
## Summary

- Migrate the research station to Astro static output backed by typed repository Markdown.
- Add safe paper figures/lightbox and Mermaid/formula fallbacks, provenance disclosures, deterministic research-track graph regions, and accessible visual fallbacks.
- Add deterministic build, static, bundle, browser, artifact-upload, and GitHub Pages workflow gates.

## Verification

- `npm ci` — passed from lockfile (703 packages).
- `BASE_PATH=/ SITE_URL=https://example.github.io npm run verify` — passed: 95/95 tests, lint, 14-page static check, 100442-byte initial interactive gzip, and repeatable root browser QA.
- `BASE_PATH=/embodied-frontier SITE_URL=https://example.github.io/embodied-frontier npm run verify` — passed: 95/95 tests, 14-page base-path static check, 100480-byte initial interactive gzip, and repeatable non-root browser QA.
- Standalone preview + `npm run qa:browser -- --base-url http://127.0.0.1:4321` — passed in the preceding acceptance pass: 252/252 assertions, 0 console errors, 0 resource/HTTP errors.
- Screenshots: `artifacts/browser-qa/{desktop-home,desktop-graph,mobile-home,reduced-motion-home,reduced-motion-graph}.png`.

## Review checklist

- [ ] Human review of source links, evidence states, comparison provenance/missing reasons, and protocol boundaries.
- [ ] Human review of paper figure source/title/alt rendering, lightbox keyboard behavior, Mermaid/formula metadata/fallbacks, and sanitizer/XSS boundaries.
- [ ] Human review of deterministic graph clusters, keyboard/path navigation, static fallback, and desktop GPU/WebGL visuals.
- [ ] Human review of third-party provenance/licenses and first-party asset ownership.
- [ ] Confirm required `verify` status check and failure-artifact upload pass on GitHub.
- [ ] Confirm `PUBLIC_REPOSITORY_URL` and Pages settings before deployment.

## Deployment

No push, PR, merge, Pages deployment, or online smoke test was performed by this local acceptance task. Only after manual review and passing required checks should the branch be pushed and a PR opened; merge and deployment remain separate human-controlled actions.
```

### Manual review gate

Do not merge or deploy based solely on this local report. A human reviewer must
inspect the complete `origin/main..HEAD` diff, factual source links and
evidence states, comparison provenance, paper media safety, graph behavior,
license notices, GPU-enabled visuals, mobile/reduced-motion behavior, and the
GitHub workflow results. The root agent owns any later push or PR handoff;
merge and Pages deployment remain manual and are not authorized by Task 12.
