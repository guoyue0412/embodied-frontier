# Task 12 final local acceptance report

Status: **DONE**

Branch: `feat/github-visual-system`

Implementation evidence HEAD before this report commit: `a6994a7`

Base: `origin/main` / `main` at `e3e6da014fe74c67b36a97dac1f6257dd67f4f54`

Remote: `https://github.com/guoyue0412/embodied-frontier.git`

The progress ledger was not edited. No push, PR, merge, Actions run, Pages
deployment, or online smoke test was performed.

## Acceptance fixes

- Safe paper Markdown figures support HTTP(S)-only image URLs, alt/title/source
  metadata, progressive native-dialog lightbox behavior, and visible Mermaid
  and formula fallbacks. Sanitizer/XSS, no-JS, reduced-motion, and base-path
  behavior remain guarded. Coverage uses a test-only placeholder fixture and
  invents no paper facts/assets.
- Models/datasets visible metadata and facts expose provenance disclosures and
  explicit missing reasons. Existing fact sources are field-level; metadata
  without a field source is explicitly record-level and not presented as
  field-verified. Desktop/mobile disclosure markup and protocol guards pass.
- Knowledge graph data now contains deterministic track clusters and regions;
  Cytoscape uses compound parent regions with deterministic positions. Explicit
  click-only loading, keyboard/path behavior, and the static list fallback
  remain intact.
- Research-track cards add fine-pointer spotlight/depth feedback with
  touch/reduced-motion fallback. Verify uploads run on success or failure, and
  Pages receives `PUBLIC_REPOSITORY_URL: https://github.com/${{ github.repository }}`.
  Browser QA waits for graph readiness/node/path conditions.

## Exact gate evidence

```text
npm ci: PASS — 703 packages installed from lockfile
npm run verify: PASS
  content: 5 papers, 3 roadmap stages, 3 projects, 3 models, 3 datasets
  build: 14 static pages
  tests: 90 passed, 0 failed, 0 skipped
  lint: PASS
  static: 14 files, 0 errors
  bundle: initialInteractiveGzip 100442 / 122880 bytes
          sharedIncludesThree false; sharedIncludesCytoscape false
  browser repeatability: 4942f768838cfb4d63fa6df307dd6d70e688fd0d07371ab2510dbe6b439fc533

standalone preview + npm run qa:browser -- --base-url http://127.0.0.1:4321: PASS
  profiles: desktop 1440x900 mouse, mobile-touch 360x800, desktop reduced-motion
  route checks: 33
  assertions: 252 passed, 0 failed
  console errors: 0; resource failures: 0; HTTP errors: 0
  screenshots: 5
```

Final screenshot artifacts were visually inspected: desktop/mobile/reduced-
motion home and graph entry were readable, graph grouping controls were
visible, and no obvious clipping or horizontal overflow was observed.
Headless Chrome uses `--disable-gpu`; normal GPU/WebGL rendering remains a
manual review item.

Source/license/security audit:

- Forbidden reference/asset scan returned no matches:
  `rg -n "ZhuYun97|embodied-ai-learning|hero-bg\\.jpg|model\\.glb" src public THIRD_PARTY_NOTICES.md`.
- `npm ls --all` exited 0.
- No new dependency or license notice was introduced by Task 12.
- No tracked build artifacts, secrets, private keys, or runtime research API
  were found.
- Before report commits, `git diff origin/main..HEAD --stat` was
  `178 files changed, 22554 insertions(+), 6782 deletions(-)`; diff check
  passed.

## Proposed PR handoff

Title:

```text
feat: migrate research station to GitHub-first visual architecture
```

Body/checklist:

```markdown
## Summary

- Migrate the research station to Astro static output backed by typed repository Markdown.
- Add safe paper figures/lightbox, Mermaid/formula fallbacks, provenance disclosures, deterministic research-track graph regions, and accessible visual fallbacks.
- Add deterministic build, static, bundle, browser, artifact-upload, and GitHub Pages workflow gates.

## Verification

- `npm ci` — passed from lockfile (703 packages).
- `npm run verify` — passed: 90/90 tests, lint, 14-page static check, 100442-byte initial interactive gzip, and repeatable browser QA.
- Standalone preview + `npm run qa:browser -- --base-url http://127.0.0.1:4321` — passed: 252/252 assertions, 0 console errors, 0 resource/HTTP errors.

## Review checklist

- [ ] Human review of source links, evidence states, comparison provenance/missing reasons, and protocol boundaries.
- [ ] Human review of paper figure source/title/alt, lightbox keyboard behavior, Mermaid/formula fallbacks, and sanitizer/XSS boundaries.
- [ ] Human review of deterministic graph clusters, keyboard/path navigation, static fallback, and GPU/WebGL visuals.
- [ ] Human review of third-party provenance/licenses and first-party asset ownership.
- [ ] Confirm required `verify` status and success/failure artifact uploads on GitHub.
- [ ] Confirm `PUBLIC_REPOSITORY_URL` and Pages settings before deployment.

## Deployment

No push, PR, merge, Pages deployment, or online smoke test was performed by this local acceptance task. Only after manual review and passing required checks should the branch be pushed and a PR opened; merge and deployment remain manual.
```

Canonical four-section evidence report:
`docs/verification/2026-08-18-github-visual-migration.md`.
