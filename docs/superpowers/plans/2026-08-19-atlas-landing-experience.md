# Atlas Landing Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the homepage as a repository-backed embodied-AI atlas command deck with reference-like spatial hierarchy and interaction rhythm.

**Architecture:** Astro renders the complete semantic atlas shell, counts, lanes, and navigation from typed collections. A small React island progressively enhances a static six-destination navigator; the existing visual runtime remains independently lazy and capability-gated.

**Tech Stack:** Astro 7, React 19, TypeScript, CSS, existing content collections, Node test runner, Chrome DevTools browser QA.

## Global Constraints

- Do not copy reference-site source, text, data, or visual assets.
- Repository Markdown remains the only research fact source.
- Initial interactive JavaScript remains below 120 KiB gzip.
- Mobile under 768px and touch devices do not download Three.js.
- Cytoscape does not download before explicit graph activation.
- All internal routes work at `/` and `/embodied-frontier/`.
- Exactly one `main` and one `h1`; controls are at least 44×44.
- No-JavaScript and reduced-motion modes retain the complete navigation and hierarchy.
- Update the existing feature branch and PR #1; do not merge or deploy.

---

### Task 1: Build the static atlas shell and research lanes

**Files:**
- Create: `src/components/static/AtlasMetric.astro`
- Create: `src/components/static/AtlasRail.astro`
- Create: `src/components/static/AtlasHero.astro`
- Create: `src/components/static/ResearchLane.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/styles/hero.css`
- Modify: `src/styles/global.css`
- Test: `tests/atlas-home.test.mjs`

**Interfaces:**
- Consumes: typed papers, models, datasets, projects, and roadmap entries plus `withBase(path)`.
- Produces: chapter anchors `atlas`, `navigator`, `vla`, `wam`, `data-eval`, and `method`; semantic repository metrics; complete static destination links.

- [ ] **Step 1: Write the failing atlas-shell test**

```js
test("homepage exposes the complete atlas command deck", async () => {
  const html = await readFile("dist/index.html", "utf8");
  for (const id of ["atlas", "navigator", "vla", "wam", "data-eval", "method"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /SYSTEM ONLINE/);
  assert.match(html, /data-atlas-metric=/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm run build && node --test tests/atlas-home.test.mjs`  
Expected: FAIL because atlas chapter anchors and components do not exist.

- [ ] **Step 3: Implement focused static components**

```astro
---
interface Props { value: string | number; label: string; code: string }
const { value, label, code } = Astro.props;
---
<div class="atlas-metric" data-atlas-metric={code}>
  <span>{code}</span><strong>{value}</strong><small>{label}</small>
</div>
```

`AtlasRail` renders normal anchor links. `AtlasHero` owns the single `h1`, status line, actions, metrics, chapter strip, static artwork, and existing `HeroExperience`. `ResearchLane` receives a question, boundary metadata, and repository-derived links.

- [ ] **Step 4: Recompose the homepage**

Read every collection in `index.astro`, derive counts and lane records at build time, render the new six-chapter sequence, and consolidate the existing notes/path/projects/evidence sections into the method chapter. WAM coverage gaps must be stated as coverage gaps.

- [ ] **Step 5: Implement the responsive atlas visual system**

Use CSS Grid for the command deck, sticky desktop rail, horizontal mobile rail, SVG/CSS rings, low-radius panels, cyan/blue/amber tokens, and responsive typography. Add touch/reduced-motion rules that remove depth/entrance motion without hiding information.

- [ ] **Step 6: Run focused and full static verification**

Run: `npm run build && node --test tests/atlas-home.test.mjs tests/rendered-html.test.mjs tests/astro-shell.test.mjs tests/design-system.test.mjs`  
Expected: PASS with one main, one h1, all anchors, base-safe links, and repository-backed metrics.

- [ ] **Step 7: Commit**

```bash
git add src/components/static/AtlasMetric.astro src/components/static/AtlasRail.astro src/components/static/AtlasHero.astro src/components/static/ResearchLane.astro src/pages/index.astro src/styles/hero.css src/styles/global.css tests/atlas-home.test.mjs
git commit -m "feat: rebuild homepage as embodied atlas"
```

---

### Task 2: Add the progressive orbital research navigator

**Files:**
- Create: `src/components/islands/AtlasNavigator.tsx`
- Create: `src/lib/atlas-navigator.mjs`
- Modify: `src/components/static/AtlasHero.astro`
- Modify: `src/styles/hero.css`
- Test: `tests/atlas-navigator.test.mjs`

**Interfaces:**
- Consumes: `Array<{ code: string; label: string; description: string; href: string }>`.
- Produces: `computeAtlasPositions(count, radius)`, `nextAtlasIndex(current, direction, count)`, and an island marked `data-atlas-navigator-ready="true"` after hydration.

- [ ] **Step 1: Write failing pure-runtime tests**

```js
test("atlas positions and keyboard navigation are deterministic", () => {
  assert.deepEqual(computeAtlasPositions(4, 100), computeAtlasPositions(4, 100));
  assert.equal(nextAtlasIndex(0, -1, 4), 3);
  assert.equal(nextAtlasIndex(3, 1, 4), 0);
});
```

- [ ] **Step 2: Run the navigator tests and confirm RED**

Run: `node --test tests/atlas-navigator.test.mjs`  
Expected: FAIL because the runtime does not exist.

- [ ] **Step 3: Implement deterministic navigator math**

```js
export function computeAtlasPositions(count, radius) {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}
```

Implement wrapped arrow-key selection in `nextAtlasIndex`.

- [ ] **Step 4: Implement the progressive island**

Render all destinations as links before hydration. After hydration, add active preview, arrow-key movement, pause/resume, pointer/focus activation, offscreen/document-hidden suspension, and cleanup. Do not add dependencies or fetch runtime content.

- [ ] **Step 5: Integrate the island without duplicating navigation**

`AtlasHero` passes the six destinations to `AtlasNavigator client:visible`. The island's server output is the single static source of links; no separate `noscript` duplicate is added.

- [ ] **Step 6: Add motion, touch, and fallback styles**

Desktop uses deterministic radial coordinates. Mobile and reduced-motion use a static two-column/grid layout. Every link/control is at least 44px and has visible focus.

- [ ] **Step 7: Verify navigator boundaries**

Run: `npm run build && node --test tests/atlas-navigator.test.mjs tests/source-boundaries.test.mjs tests/bundle-budget.test.mjs`  
Expected: PASS; no new dependency, no Three/Cytoscape reference, and initial gzip remains below 122880 bytes.

- [ ] **Step 8: Commit**

```bash
git add src/components/islands/AtlasNavigator.tsx src/lib/atlas-navigator.mjs src/components/static/AtlasHero.astro src/styles/hero.css tests/atlas-navigator.test.mjs
git commit -m "feat: add progressive atlas navigator"
```

---

### Task 3: Gate the visual target and update PR evidence

**Files:**
- Modify: `scripts/browser-qa.mjs`
- Modify: `tests/atlas-home.test.mjs`
- Modify: `artifacts/browser-qa/desktop-home.png`
- Modify: `artifacts/browser-qa/mobile-home.png`
- Modify: `artifacts/browser-qa/reduced-motion-home.png`
- Create: `docs/verification/2026-08-19-atlas-landing-acceptance.md`

**Interfaces:**
- Consumes: built root/non-root sites and atlas readiness markers.
- Produces: deterministic desktop/mobile/reduced-motion screenshot evidence and PR-ready acceptance report.

- [ ] **Step 1: Add failing browser assertions**

Require the first viewport to expose system status, repository metrics, primary actions, visible embodied fallback, chapter navigation, and navigator controls. Add keyboard activation, 44px touch targets, no horizontal overflow, no-JS destination visibility, and reduced-motion static layout checks.

- [ ] **Step 2: Run QA against the pre-gate state**

Run: `npm run verify`  
Expected: FAIL until all new assertions and screenshot metadata are satisfied.

- [ ] **Step 3: Fix only observed acceptance defects**

Adjust component markup/CSS/readiness conditions based on failed assertions and visual inspection. Do not add content or decorative runtime unrelated to the acceptance criteria.

- [ ] **Step 4: Run complete root and Pages-base verification**

```bash
BASE_PATH=/ SITE_URL=https://example.github.io npm run verify
BASE_PATH=/embodied-frontier SITE_URL=https://example.github.io/embodied-frontier npm run verify
```

Expected: all tests, static checks, bundle budget, and browser assertions pass with deterministic screenshots.

- [ ] **Step 5: Inspect screenshots**

Confirm the 1440×900 image reads as an atlas command deck, the 360×800 image retains primary actions and navigation without overflow, and the reduced-motion image preserves hierarchy without animated displacement.

- [ ] **Step 6: Write acceptance evidence and commit**

```bash
git add scripts/browser-qa.mjs tests/atlas-home.test.mjs artifacts/browser-qa docs/verification/2026-08-19-atlas-landing-acceptance.md
git commit -m "test: gate atlas landing experience"
```

- [ ] **Step 7: Independent review and PR update**

Generate a review package from the plan base to HEAD. Require no Critical or Important findings, then push the feature branch, update PR #1 with new screenshots/evidence, and wait for GitHub `verify`. Do not merge.
