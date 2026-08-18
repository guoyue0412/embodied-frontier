# Embodied Frontier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independent, mobile-first embodied AI research site whose canonical content is repository Markdown, then extend it with local knowledge exploration and a human-reviewed automated research pipeline.

**Architecture:** Markdown is validated and compiled into a generated JSON artifact before each development or production build. Vinext React Server Components consume typed records and render static-first routes; later phases add a lazy client-side search/graph layer and GitHub Actions that can only propose content through pull requests.

**Tech Stack:** Vinext 1, React 19, TypeScript 5.9, Vite 8, gray-matter, marked, sanitize-html, Node test runner, Cloudflare-compatible Sites build.

## Global Constraints

- The site is independent from CareerForge and lives in `embodied-frontier/`.
- Repository Markdown is the only canonical content source.
- Do not copy source code, visual assets, copy, branding, or datasets from `ZhuYun97/embodied-ai-learning`.
- Deliver stages in order: publishing surface, knowledge exploration, automated research PRs.
- Automated research may create a PR but may never merge or publish directly.
- Stage one uses no database, authentication, CMS, WebGL, Three.js, or blocking intro animation.
- Support 360 px viewports, keyboard navigation, visible focus, WCAG AA contrast, and `prefers-reduced-motion`.
- Build failure is required for malformed frontmatter, duplicate slugs, invalid status values, invalid dates, or invalid source URLs.

---

## Stage One — Publishable Research Site

### Task 1: Markdown Content Compiler

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `scripts/build-content.mjs`
- Create: `content/papers/openvla.md`
- Create: `content/papers/pi0.md`
- Create: `content/papers/diffusion-policy.md`
- Create: `content/papers/gen2act.md`
- Create: `content/papers/bridge-data-v2.md`
- Create: `content/roadmap/foundations.md`
- Create: `content/roadmap/core-systems.md`
- Create: `content/roadmap/frontier.md`
- Create: `content/projects/rbench-evaluation.md`
- Create: `content/projects/wam-evaluation.md`
- Create: `content/projects/vla-radar.md`
- Generate: `generated/content.json`

**Interfaces:**
- Consumes: Markdown files with YAML frontmatter.
- Produces: `generated/content.json` with `{ papers, roadmap, projects, generatedAt }`.

- [ ] **Step 1: Install the content dependencies**

Run:

```bash
npm install gray-matter@4 marked@16 sanitize-html@2
```

Expected: dependencies are added to `package.json` and the lockfile resolves without peer errors.

- [ ] **Step 2: Add the content build script and lifecycle hooks**

Set scripts to:

```json
{
  "content:build": "node scripts/build-content.mjs",
  "predev": "npm run content:build",
  "prebuild": "npm run content:build",
  "dev": "WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext dev",
  "build": "WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext build",
  "start": "WRANGLER_LOG_PATH=.wrangler/wrangler.log vinext start",
  "test": "npm run build && node --test tests/*.test.mjs"
}
```

- [ ] **Step 3: Implement validation and compilation**

`scripts/build-content.mjs` must:

```js
const allowedStatuses = new Set(["verified", "self-reported", "unverified"]);

function assertIsoDate(value, field, file) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) {
    throw new Error(`${file}: ${field} must be YYYY-MM-DD`);
  }
}

function assertHttpUrl(value, file) {
  const url = new URL(value);
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error(`${file}: source URL must use http or https`);
  }
}
```

It must parse every Markdown file, reject unsafe metadata, sanitize rendered HTML with an allowlist, sort papers by `updated` descending, and write deterministic JSON (except `generatedAt`).

- [ ] **Step 4: Add representative real content**

Each paper must include `title`, `slug`, `date`, `updated`, `track`, `venue`, `status`, `tags`, `summary`, and at least one source URL. Roadmap and project entries must use their dedicated schemas and include concrete embodied-AI content.

- [ ] **Step 5: Verify the content compiler**

Run:

```bash
npm run content:build
```

Expected: `generated/content.json` contains 5 papers, 3 roadmap stages, and 3 projects.

### Task 2: Typed Content Query Layer

**Files:**
- Create: `lib/content/types.ts`
- Create: `lib/content/index.ts`

**Interfaces:**
- Consumes: `generated/content.json`.
- Produces: `getPapers()`, `getPaper(slug)`, `getRoadmap()`, `getProjects()`.

- [ ] **Step 1: Define exact record types**

```ts
export type EvidenceStatus = "verified" | "self-reported" | "unverified";
export interface SourceLink { label: string; url: string }
export interface PaperRecord {
  title: string; slug: string; date: string; updated: string; track: string;
  venue: string; status: EvidenceStatus; tags: string[]; summary: string;
  sources: SourceLink[]; html: string;
}
```

- [ ] **Step 2: Implement immutable query helpers**

`getPapers()` must return a copy, and `getPaper(slug)` must return `undefined` for an unknown slug. No UI component may import the generated JSON directly.

- [ ] **Step 3: Run the production type/build gate**

Run `npm run build`.

Expected: TypeScript and Vinext build pass with no missing JSON or route import errors.

### Task 3: Shared Accessible Site Shell

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `components/site-header.tsx`
- Create: `components/site-footer.tsx`
- Create: `components/evidence-badge.tsx`
- Create: `components/section-heading.tsx`
- Delete: `app/_sites-preview/SkeletonPreview.tsx`
- Delete: `app/_sites-preview/preview.css`

**Interfaces:**
- Consumes: standard React children and `EvidenceStatus`.
- Produces: consistent navigation, footer, headings, and evidence labels.

- [ ] **Step 1: Replace starter metadata and document language**

Set the root language to `zh-CN`, title template to `%s · 具身前沿`, default title to `具身前沿`, and description to `以证据为坐标的具身智能研究站：VLA、世界模型、数据与评测。`.

- [ ] **Step 2: Build semantic navigation**

Header links must be `/`, `/papers`, `/roadmap`, `/projects`, and `/about`. Add a first-focus skip link targeting `#main-content`.

- [ ] **Step 3: Implement the visual tokens**

Define CSS variables for paper, ink, cobalt, orange, muted text, rules, surface, success, warning, and pending. Use CSS grid/gradients only; do not add decorative image dependencies.

- [ ] **Step 4: Implement accessibility states**

All links and buttons need visible `:focus-visible`; mobile touch targets must be at least 44 px; reduced-motion must disable translate animations and smooth scrolling.

- [ ] **Step 5: Remove the starter preview**

Remove `_sites-preview`, `codex-preview` metadata, and `react-loading-skeleton` from dependencies; refresh the lockfile.

### Task 4: First Meaningful Homepage

**Files:**
- Replace: `app/page.tsx`
- Create: `components/paper-card.tsx`
- Create: `components/research-track-card.tsx`
- Create: `components/project-card.tsx`

**Interfaces:**
- Consumes: typed content query helpers.
- Produces: a complete home route with real research content.

- [ ] **Step 1: Build the first viewport**

Include the eyebrow `EMBODIED INTELLIGENCE · FIELD NOTES`, headline `把具身智能研究，整理成可验证的坐标。`, a concise evidence-first description, `/papers` primary action, `/roadmap` secondary action, and three track summaries for VLA, WAM, and Data & Eval.

- [ ] **Step 2: Add content-driven sections**

Render the three most recently updated papers, all roadmap stages, and the two most recently updated projects from the query layer.

- [ ] **Step 3: Add the evidence convention**

Explain all three statuses in visible text. Do not rely on green/orange/gray alone.

- [ ] **Step 4: Force a non-browser render**

Start `npm run dev`, request the exact local homepage URL once, and require a 200 response before any browser handoff.

### Task 5: Paper Library and Detail Routes

**Files:**
- Create: `app/papers/page.tsx`
- Create: `app/papers/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPapers()` and `getPaper(slug)`.
- Produces: paper index and independently shareable paper pages.

- [ ] **Step 1: Implement the paper index**

Render all papers grouped by track with visible count, evidence badge, venue, updated date, summary, tags, and detail link.

- [ ] **Step 2: Implement the paper detail page**

Resolve the slug, render 404 for unknown records, display metadata and sources, and render only sanitized compiler output with `dangerouslySetInnerHTML`.

- [ ] **Step 3: Add record-specific metadata**

`generateMetadata` must derive title and description from the same paper record, set paper-specific Open Graph/X title and description, and explicitly omit inherited social images because paper records have no primary image in stage one.

- [ ] **Step 4: Verify representative routes**

Require 200 for `/papers`, `/papers/openvla`, and `/papers/pi0`; require 404 for `/papers/not-a-paper`.

### Task 6: Roadmap, Projects, About, and Discovery Metadata

**Files:**
- Create: `app/roadmap/page.tsx`
- Create: `app/projects/page.tsx`
- Create: `app/about/page.tsx`
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`
- Create: `public/favicon.svg`

**Interfaces:**
- Consumes: roadmap, project, and paper query helpers.
- Produces: all stage-one primary routes plus crawl metadata.

- [ ] **Step 1: Build the roadmap page**

Render foundation, core-system, and frontier stages in order, each with goals, outputs, and reading entry points.

- [ ] **Step 2: Build the projects page**

Render project status, question, evidence, and next step. Clearly distinguish completed evidence from planned work.

- [ ] **Step 3: Build the about page**

Document scope, content workflow, evidence semantics, correction policy, and the rule that AI-generated research requires PR review.

- [ ] **Step 4: Add robots and sitemap**

Sitemap must include every static route and every paper detail route.

### Task 7: Stage-One Test and Quality Gates

**Files:**
- Replace: `tests/rendered-html.test.mjs`
- Create: `tests/content-validation.test.mjs`
- Create: `tests/source-boundaries.test.mjs`

**Interfaces:**
- Consumes: production worker output and source tree.
- Produces: reproducible acceptance evidence.

- [ ] **Step 1: Test server-rendered HTML**

Assert root status 200, Chinese title, one `h1`, skip link, primary navigation, research tracks, evidence labels, and absence of starter metadata/text.

- [ ] **Step 2: Test content validation failures**

Run the compiler against temporary fixtures and assert actionable errors for duplicate slug, invalid status, invalid date, and non-http source URL.

- [ ] **Step 3: Test source boundaries**

Assert there are no imports, copied filenames, brand strings, WebGL/Three.js dependencies, or remote runtime content requests inherited from the reference site.

- [ ] **Step 4: Run full validation**

Run:

```bash
npm test
npm run lint
```

Expected: all tests pass; lint exits 0.

- [ ] **Step 5: Perform browser verification**

Verify root, papers, one paper detail, roadmap, and projects at desktop and 360 px width. Check keyboard navigation, focus visibility, no horizontal overflow, reduced-motion behavior, and console errors.

---

## Stage Two — Knowledge Exploration

### Task 8: Local Full-Text Search and Filters

**Files:**
- Create: `scripts/build-search-index.mjs`
- Create: `generated/search-index.json`
- Create: `components/paper-explorer.tsx`
- Modify: `app/papers/page.tsx`
- Create: `tests/search-index.test.mjs`

**Interfaces:**
- Consumes: compiled paper records.
- Produces: a versioned local index and client filters for query, track, tag, year, venue, and status.

- [ ] Build a compact normalized token index at build time.
- [ ] Lazy-load the client explorer only on `/papers`.
- [ ] Preserve a complete server-rendered paper list when JavaScript is unavailable.
- [ ] Encode filters in URL search parameters and provide a one-action clear control.
- [ ] Test Chinese/English queries, filter intersections, empty states, and URL restoration.

### Task 9: Model and Dataset Comparison

**Files:**
- Create: `content/models/*.md`
- Create: `content/datasets/*.md`
- Extend: `scripts/build-content.mjs`
- Create: `app/models/page.tsx`
- Create: `app/datasets/page.tsx`
- Create: `components/comparison-table.tsx`

**Interfaces:**
- Consumes: explicit model and dataset schemas.
- Produces: accessible comparison tables with source and confidence per field.

- [ ] Validate units and confidence at field level.
- [ ] Refuse cross-benchmark ranking unless protocol keys match.
- [ ] Provide stacked mobile cards as the semantic equivalent of wide tables.
- [ ] Test missing values, mixed confidence, and protocol mismatch warnings.

### Task 10: Knowledge Graph with List Equivalent

**Files:**
- Create: `scripts/build-graph.mjs`
- Create: `generated/knowledge-graph.json`
- Create: `app/graph/page.tsx`
- Create: `components/knowledge-graph.tsx`
- Create: `components/relationship-list.tsx`

**Interfaces:**
- Consumes: explicit `relations` fields from Markdown.
- Produces: node/edge JSON, lazy visual graph, and keyboard-accessible relationship list.

- [ ] Validate all relation targets and reject dangling edges.
- [ ] Lazy-load visualization code after the page content.
- [ ] Make every graph query available through the list view.
- [ ] Test graph determinism, dangling relations, keyboard selection, and reduced motion.

---

## Stage Three — Automated Research via Reviewed Pull Requests

### Task 11: Candidate Discovery and Deduplication

**Files:**
- Create: `scripts/research/discover.mjs`
- Create: `scripts/research/dedupe.mjs`
- Create: `schemas/research-candidate.schema.json`
- Create: `tests/research-dedupe.test.mjs`

**Interfaces:**
- Consumes: configured primary feeds/APIs and existing Markdown.
- Produces: validated candidate JSON in CI workspace only.

- [ ] Normalize DOI, arXiv ID, URL, and title fingerprint.
- [ ] Reject inaccessible or unsupported source schemes.
- [ ] Record discovery timestamp and source endpoint.
- [ ] Test exact duplicate, versioned arXiv URL, title variant, and false-positive boundaries.

### Task 12: AI Extraction with Evidence Contract

**Files:**
- Create: `scripts/research/extract.mjs`
- Create: `scripts/research/render-markdown.mjs`
- Create: `schemas/research-extraction.schema.json`
- Create: `tests/research-extraction.test.mjs`

**Interfaces:**
- Consumes: candidate JSON and secret API credentials in CI.
- Produces: schema-valid Markdown drafts with claim-level sources and evidence state.

- [ ] Require structured model output and reject non-schema responses.
- [ ] Default author-reported metrics to `self-reported`.
- [ ] Prevent generated citations that are absent from the candidate source set.
- [ ] Render drafts only under `content/inbox/` on a workflow branch.

### Task 13: Scheduled PR Workflow and Branch Protection Contract

**Files:**
- Create: `.github/workflows/research-discovery.yml`
- Create: `.github/workflows/content-check.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE/research-update.md`
- Create: `docs/research-review.md`

**Interfaces:**
- Consumes: GitHub Actions schedule/manual trigger and repository secrets.
- Produces: a reviewable PR with report and validated Markdown; never a direct main-branch write.

- [ ] Grant only `contents: write` and `pull-requests: write` to the discovery job.
- [ ] Create or update a named bot branch; never push to `main`.
- [ ] Run content validation and production build before PR creation.
- [ ] Include added/updated/skipped/error counts and source links in the PR body.
- [ ] Document required branch rules: one human approval, passing content/build checks, no auto-merge.
- [ ] Perform a dry run with no secret output and verify that no production deployment occurs.

---

## Final Acceptance

- [ ] Source audit confirms independent branding/assets and bounded modules.
- [ ] Production build and all automated tests pass from a clean checkout.
- [ ] Browser verification covers representative desktop/mobile routes and keyboard use.
- [ ] Deployment is reported separately and only marked complete after a public URL returns the expected site.
- [ ] Automated research is not marked complete until a dry-run PR is created and requires human approval.
