# Atlas Landing Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the homepage as a repository-backed embodied-AI atlas command deck with reference-like spatial hierarchy and interaction rhythm, plus a first-class anonymized Demo Lab.

**Architecture:** Astro renders the complete semantic atlas shell, counts, lanes, navigation, and Demo Lab from typed collections. A small React island progressively enhances the static navigator, which expands from six to seven destinations when Demo Lab is added; accessible video remains a static Astro enhancement and the existing visual runtime stays independently lazy and capability-gated.

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
- Demo content is user-approved, anonymized repository Markdown; never invent companies, outcomes, metrics, screenshots, or employment claims.
- Demo records reject `company`, `employer`, and `client`; publication requires `anonymized: true`, `public: true`, evidence, disclosure, and confirmed media rights.
- Small video assets are ordinary Git files under `public/videos/`; do not use Git LFS, autoplay, arbitrary iframes, or unreviewed third-party embeds.
- Demo video uses `controls`, `playsinline`, `preload="metadata"`, a poster, base-safe sources, and captions when speech or meaningful audio is present.
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

- [x] **Step 1: Write failing pure-runtime tests**

```js
test("atlas positions and keyboard navigation are deterministic", () => {
  assert.deepEqual(computeAtlasPositions(4, 100), computeAtlasPositions(4, 100));
  assert.equal(nextAtlasIndex(0, -1, 4), 3);
  assert.equal(nextAtlasIndex(3, 1, 4), 0);
});
```

- [x] **Step 2: Run the navigator tests and confirm RED**

Run: `node --test tests/atlas-navigator.test.mjs`
Expected: FAIL because the runtime does not exist.

- [x] **Step 3: Implement deterministic navigator math**

```js
export function computeAtlasPositions(count, radius) {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}
```

Implement wrapped arrow-key selection in `nextAtlasIndex`.

- [x] **Step 4: Implement the progressive island**

Render all destinations as links before hydration. After hydration, add active preview, arrow-key movement, pause/resume, pointer/focus activation, offscreen/document-hidden suspension, and cleanup. Do not add dependencies or fetch runtime content.

- [x] **Step 5: Integrate the island without duplicating navigation**

`AtlasHero` passes the six destinations to `AtlasNavigator client:visible`. The island's server output is the single static source of links; no separate `noscript` duplicate is added.

- [x] **Step 6: Add motion, touch, and fallback styles**

Desktop uses deterministic radial coordinates. Mobile and reduced-motion use a static two-column/grid layout. Every link/control is at least 44px and has visible focus.

- [x] **Step 7: Verify navigator boundaries**

Run: `npm run build && node --test tests/atlas-navigator.test.mjs tests/source-boundaries.test.mjs tests/bundle-budget.test.mjs`
Expected: PASS; no new dependency, no Three/Cytoscape reference, and initial gzip remains below 122880 bytes.

- [x] **Step 8: Commit**

```bash
git add src/components/islands/AtlasNavigator.tsx src/lib/atlas-navigator.mjs src/components/static/AtlasHero.astro src/styles/hero.css tests/atlas-navigator.test.mjs
git commit -m "feat: add progressive atlas navigator"
```

---

### Task 3: Add the anonymized Demo Lab tab and safe video delivery

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/components/static/SiteHeader.astro`
- Modify: `src/components/static/AtlasHero.astro`
- Modify: `src/components/static/AtlasRail.astro`
- Create: `src/components/static/DemoCard.astro`
- Create: `src/components/static/DemoVideo.astro`
- Modify: `src/pages/index.astro`
- Create: `src/pages/demos/index.astro`
- Create: `src/pages/demos/[slug].astro`
- Create: `src/content/demos/.gitkeep`
- Modify: `src/styles/global.css`
- Test: `tests/demo-lab.test.mjs`
- Test: `tests/demo-video-safety.test.mjs`

**Interfaces:**
- Consumes: the typed `demos` collection and `withBase(path)`.
- Produces: `/demos/`, `/demos/[slug]/`, a global `Demo Lab / 作品实验室` tab, Atlas chapter anchor `demo-lab`, a seventh navigator destination, `DemoCard`, and `DemoVideo`.
- `DemoVideo` consumes `{ title: string; poster: string; webm?: string; mp4?: string; captions?: string }` and emits only native `<video>`, `<source>`, and optional `<track>` markup with base-safe asset paths.

- [x] **Step 1: Write failing collection and route tests**

```js
test("Demo Lab is a primary tab with an honest empty state", async () => {
  const home = await readFile("dist/index.html", "utf8");
  const gallery = await readFile("dist/demos/index.html", "utf8");
  assert.match(home, /href=["'][^"']*\/demos\/["']/);
  assert.match(gallery, /Demo Lab|作品实验室/);
  assert.match(gallery, /尚无已审核并公开的 Demo/);
});

test("forbidden organization fields are encoded in the Demo schema", async () => {
  const source = await readFile("src/content.config.ts", "utf8");
  for (const key of ["company", "employer", "client"]) {
    assert.match(source, new RegExp(`${key}:\\s*z\\.never\\(\\)\\.optional\\(\\)`));
  }
});
```

- [x] **Step 2: Run the focused tests and confirm RED**

Run: `npm run build && node --test tests/demo-lab.test.mjs tests/demo-video-safety.test.mjs`
Expected: FAIL because the Demo collection, routes, tab, and safe video component do not exist.

- [x] **Step 3: Add the strict typed Demo collection**

```ts
const demoVideoAsset = z.string().regex(/^\/videos\/[a-z0-9/_-]+\.(?:webm|mp4)$/);
const demoPosterAsset = z.string().regex(/^\/videos\/[a-z0-9/_-]+\.(?:webp|avif|jpg|jpeg|png)$/);
const demoCaptionAsset = z.string().regex(/^\/videos\/[a-z0-9/_-]+\.vtt$/);
const demoVideo = z.object({
  webm: demoVideoAsset.regex(/\.webm$/).optional(),
  mp4: demoVideoAsset.regex(/\.mp4$/).optional(),
  poster: demoPosterAsset,
  captions: demoCaptionAsset.optional(),
}).refine((value) => Boolean(value.webm || value.mp4), { message: "video requires webm or mp4" });

const demos = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/demos" }),
  schema: z.object({
    ...dated,
    role: z.string().min(1),
    period: z.string().regex(/^\d{4}(?: (?:Q[1-4]|上半年|下半年))?$/).optional(),
    contributions: z.array(z.string().min(1)).min(1),
    stack: z.array(z.string().min(1)).min(1),
    video: demoVideo.optional(),
    evidence: z.array(z.string().min(1)).min(1),
    sources: z.array(source).default([]),
    anonymized: z.literal(true),
    disclosure: z.literal("本页面为个人参与项目的匿名化演示或独立重建，不包含实习公司的名称、内部代码、私有数据和未公开产品信息，也不代表原公司的官方实现。"),
    mediaRights: z.enum(["original", "authorized", "open-licensed"]),
    public: z.literal(true),
    company: z.never().optional(),
    employer: z.never().optional(),
    client: z.never().optional(),
  }).strict(),
});
```

Export `demos` from `collections`. Keep `src/content/demos/` empty except for `.gitkeep`; do not create fictional sample records.

- [x] **Step 4: Build gallery, detail, and navigation surfaces**

`SiteHeader` adds `{ path: "/demos/", label: "Demo Lab" }`. `AtlasHero` adds the same base-safe seventh destination; `AtlasRail` and `index.astro` add the `demo-lab` chapter linking to the gallery. The gallery filters/sorts validated public records and renders `尚无已审核并公开的 Demo。内容将在完成匿名化与媒体授权检查后发布。` when empty. Detail pages are generated only from the collection and show role, optional broad period, contributions, stack, evidence, sources, and the required disclosure; no organization placeholder is rendered.

- [x] **Step 5: Implement native safe video rendering**

```astro
<video controls playsinline preload="metadata" poster={withBase(video.poster)} aria-label={`${title} 演示视频`}>
  {video.webm && <source src={withBase(video.webm)} type="video/webm" />}
  {video.mp4 && <source src={withBase(video.mp4)} type="video/mp4" />}
  {video.captions && <track kind="captions" src={withBase(video.captions)} srclang="zh" label="中文字幕" default />}
  当前浏览器无法播放该视频，请阅读页面中的文字说明与证据。
</video>
```

Gallery cards use only poster imagery. Detail video has no `autoplay`, iframe, forced loop, or raw HTML injection. CSS keeps posters at a stable aspect ratio, controls keyboard-visible, and content free of horizontal overflow.

- [x] **Step 6: Add media and privacy contract tests**

```js
test("Demo video is accessible and GitHub Pages safe", async () => {
  const source = await readFile("src/components/static/DemoVideo.astro", "utf8");
  assert.match(source, /controls/);
  assert.match(source, /playsinline/);
  assert.match(source, /preload=["']metadata["']/);
  assert.match(source, /withBase\(video\.(?:poster|webm|mp4|captions)\)/);
  assert.doesNotMatch(source, /autoplay|<iframe|set:html/);
});
```

Also scan `src/content/demos` and `public/videos` for Git LFS pointer headers and reject them. Check approved assets/copy for logos, domains, private repository paths, internal UI, customer or colleague information, faces and badges, tokens, IPs, private model/checkpoint/benchmark names, unapproved metrics, and EXIF metadata before adding any record.

- [x] **Step 7: Verify root and GitHub Pages base paths**

```bash
BASE_PATH=/ SITE_URL=https://example.github.io npm run build
node --test tests/demo-lab.test.mjs tests/demo-video-safety.test.mjs tests/rendered-html.test.mjs
BASE_PATH=/embodied-frontier SITE_URL=https://example.github.io/embodied-frontier npm run build
node --test tests/demo-lab.test.mjs tests/demo-video-safety.test.mjs tests/rendered-html.test.mjs
```

Expected: PASS; navigation and all media URLs are base-safe, the no-content build shows the honest empty state, and no Demo HTML contains a company/employer/client field.

- [x] **Step 8: Commit**

```bash
git add src/content.config.ts src/content/demos/.gitkeep src/components/static/SiteHeader.astro src/components/static/AtlasHero.astro src/components/static/AtlasRail.astro src/components/static/DemoCard.astro src/components/static/DemoVideo.astro src/pages/index.astro src/pages/demos src/styles/global.css tests/demo-lab.test.mjs tests/demo-video-safety.test.mjs
git commit -m "feat: add anonymized Demo Lab"
```

---

### Task 4: Gate the visual target and update PR evidence

**Files:**
- Modify: `scripts/browser-qa.mjs`
- Modify: `tests/atlas-home.test.mjs`
- Modify: `artifacts/browser-qa/desktop-home.png`
- Modify: `artifacts/browser-qa/mobile-home.png`
- Modify: `artifacts/browser-qa/reduced-motion-home.png`
- Create: `artifacts/browser-qa/desktop-demos.png`
- Create: `artifacts/browser-qa/mobile-demos.png`
- Create: `docs/verification/2026-08-19-atlas-landing-acceptance.md`

**Interfaces:**
- Consumes: built root/non-root sites and atlas readiness markers.
- Produces: deterministic desktop/mobile/reduced-motion screenshot evidence and PR-ready acceptance report.

- [x] **Step 1: Add failing browser assertions**

Require the first viewport to expose system status, repository metrics, primary actions, visible embodied fallback, chapter navigation, navigator controls, and the Demo Lab destination. Add keyboard activation, 44px touch targets, no horizontal overflow, no-JS destination visibility, and reduced-motion static layout checks. Gate `/demos/` desktop/mobile empty-state screenshots; once user-approved Demo content exists, also gate one detail page and native video controls.

- [x] **Step 2: Run QA against the pre-gate state**

Run: `npm run verify`
Expected: FAIL until all new assertions and screenshot metadata are satisfied.

- [x] **Step 3: Fix only observed acceptance defects**

Adjust component markup/CSS/readiness conditions based on failed assertions and visual inspection. Do not add content or decorative runtime unrelated to the acceptance criteria.

- [x] **Step 4: Run complete root and Pages-base verification**

```bash
BASE_PATH=/ SITE_URL=https://example.github.io npm run verify
BASE_PATH=/embodied-frontier SITE_URL=https://example.github.io/embodied-frontier npm run verify
```

Expected: all tests, static checks, bundle budget, and browser assertions pass with deterministic screenshots.

- [x] **Step 5: Inspect screenshots**

Confirm the 1440×900 image reads as an atlas command deck, the 360×800 image retains primary actions and navigation without overflow, and the reduced-motion image preserves hierarchy without animated displacement. Confirm Demo Lab reads as an intentional portfolio surface rather than a résumé timeline and exposes no organization identity.

- [x] **Step 6: Write acceptance evidence and commit**

```bash
git add scripts/browser-qa.mjs tests/atlas-home.test.mjs artifacts/browser-qa docs/verification/2026-08-19-atlas-landing-acceptance.md
git commit -m "test: gate atlas landing experience"
```

- [ ] **Step 7: Independent review and PR update**

Generate a review package from the plan base to HEAD. Require no Critical or Important findings, then push the feature branch, update PR #1 with new screenshots/evidence, and wait for GitHub `verify`. Do not merge.
