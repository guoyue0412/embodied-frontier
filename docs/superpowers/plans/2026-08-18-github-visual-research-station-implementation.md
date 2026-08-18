# GitHub-first Visual Research Station Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Embodied Frontier to an Astro static site deployed by GitHub Pages, preserve its Markdown-backed research behavior, and add licensed interactive visual islands with complete mobile, accessibility, and failure fallbacks.

**Architecture:** Astro renders every route and research record to static HTML. React islands are reserved for search state, visual effects, the procedural Three.js embodiment, and the optional Cytoscape graph; all content remains in typed repository Markdown collections. Pull requests run content, test, build, accessibility, link, and bundle-budget checks, while only verified `main` commits deploy through GitHub Pages.

**Tech Stack:** Node.js 22.13+, Astro, React 19, TypeScript, repository Markdown, React Bits source components, Three.js, Cytoscape.js, Node test runner, ESLint, GitHub Actions, GitHub Pages.

## Global Constraints

- Repository Markdown is the only content source of truth; no database, runtime CMS, or runtime research API is allowed.
- Preserve the public routes `/`, `/about`, `/datasets`, `/graph`, `/models`, `/papers`, `/papers/<slug>`, `/projects`, and `/roadmap`.
- Preserve evidence states `verified`, `self-reported`, and `unverified`, including field-level source and protocol restrictions.
- Do not copy source, content, branding, or visual assets from `ZhuYun97/embodied-ai-learning`; only licensed upstream code or independently authored code may enter the repository.
- Every third-party visual component must record source URL, pinned revision or package version, copyright, license, and local files in `THIRD_PARTY_NOTICES.md`.
- `prefers-reduced-motion: reduce` must disable character shuffling, pointer parallax, and continuous animation.
- Touch devices and viewports narrower than 768 px must not download the procedural Three.js island or Cytoscape unless the user explicitly requests the graph.
- Three.js and Cytoscape must remain outside the shared page bundle.
- Initial interactive-island JavaScript, excluding lazy Three.js, must remain at or below 120 KB gzip.
- GitHub Pages is the production path; no old deployment is removed without separate user authorization.
- `main` is the only production branch; production changes enter through a pull request with passing checks and manual merge.

---

## File Structure

The migration will converge on this structure:

```text
astro.config.mjs                         # GitHub Pages site/base/output configuration
src/content.config.ts                    # Collection schemas and relation validation
src/content/{papers,models,datasets,...} # Single Markdown fact source
src/layouts/SiteLayout.astro             # Shared HTML shell and metadata
src/pages/**                              # Static routes and content pages
src/components/static/**                 # Zero-JS Astro presentation components
src/components/islands/**                # React interactive islands
src/lib/{search,comparison,graph}.mjs     # UI-independent research rules
src/styles/{tokens,global,motion}.css     # Visual tokens, layout, reduced-motion rules
scripts/validate-relations.mjs            # Cross-collection relation validation
scripts/check-bundle-budget.mjs           # Built-asset gzip budget enforcement
scripts/check-static-site.mjs             # Route, link, landmark, and fallback checks
tests/**                                  # Unit and built-output regression tests
.github/workflows/{verify,deploy-pages}.yml
.github/pull_request_template.md
.github/CODEOWNERS
THIRD_PARTY_NOTICES.md
```

Old `app/`, `components/`, `worker/`, `vite.config.ts`, `next.config.ts`, `next-env.d.ts`, and Vinext-specific files remain until Task 4 proves static route equivalence. They are removed only in Task 4, in the same commit that switches the default build to Astro.

---

### Task 1: Establish the Astro migration lane without breaking the current site

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Create: `astro.config.mjs`
- Create: `src/env.d.ts`
- Create: `src/pages/migration-check.astro`
- Create: `tests/astro-foundation.test.mjs`

**Interfaces:**
- Consumes: current Node `>=22.13.0` runtime and npm lockfile.
- Produces: `npm run astro:build`, `dist/migration-check/index.html`, and the environment variables `SITE_URL` and `BASE_PATH`.

- [ ] **Step 1: Write the failing Astro foundation test**

```js
// tests/astro-foundation.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Astro emits a static migration route", async () => {
  const html = await readFile("dist/migration-check/index.html", "utf8");
  assert.match(html, /<h1>Astro migration baseline<\/h1>/);
  assert.doesNotMatch(html, /__next|vinext|wrangler/i);
});
```

- [ ] **Step 2: Run the test and verify the missing Astro output**

Run: `node --test tests/astro-foundation.test.mjs`

Expected: FAIL with `ENOENT` for `dist/migration-check/index.html`.

- [ ] **Step 3: Install the Astro runtime alongside the existing runtime**

Run:

```bash
npm install astro@latest @astrojs/react@latest @astrojs/mdx@latest @astrojs/check@latest
```

Expected: `package-lock.json` records Astro and the two official integrations without removing React 19.

- [ ] **Step 4: Add the isolated Astro configuration and route**

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";

const site = process.env.SITE_URL || "https://example.github.io";
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
  integrations: [react(), mdx()],
  build: { format: "directory" },
});
```

```ts
/// <reference types="astro/client" />
```

```astro
---
// src/pages/migration-check.astro
---
<!doctype html>
<html lang="zh-CN">
  <head><meta charset="utf-8" /><title>Migration check</title></head>
  <body><main><h1>Astro migration baseline</h1></main></body>
</html>
```

Add this script without changing the current `build` script:

```json
"astro:build": "astro build"
```

Replace `tsconfig.json` with:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

- [ ] **Step 5: Build and run the focused test**

Run: `npm run astro:build && node --test tests/astro-foundation.test.mjs`

Expected: one passing test and a static `dist/migration-check/index.html`.

- [ ] **Step 6: Commit the isolated migration lane**

```bash
git add package.json package-lock.json tsconfig.json astro.config.mjs src/env.d.ts src/pages/migration-check.astro tests/astro-foundation.test.mjs
git commit -m "build: establish astro migration lane"
```

---

### Task 2: Move Markdown into typed Astro content collections

**Files:**
- Create: `src/content.config.ts`
- Move: `content/papers/*.md` to `src/content/papers/*.md`
- Move: `content/models/*.md` to `src/content/models/*.md`
- Move: `content/datasets/*.md` to `src/content/datasets/*.md`
- Move: `content/projects/*.md` to `src/content/projects/*.md`
- Move: `content/roadmap/*.md` to `src/content/roadmap/*.md`
- Modify: `scripts/build-content.mjs`
- Create: `scripts/validate-relations.mjs`
- Create: `tests/astro-content.test.mjs`

**Interfaces:**
- Consumes: the existing frontmatter fields and generated search/graph contracts.
- Produces: Astro collections named `papers`, `models`, `datasets`, `projects`, and `roadmap`; `npm run content:validate`.

- [ ] **Step 1: Write tests for collection ownership and cross-reference failures**

```js
// tests/astro-content.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { validateRelations } from "../scripts/validate-relations.mjs";

test("all research Markdown lives under src/content", async () => {
  await access("src/content/papers/openvla.md");
  await assert.rejects(access("content/papers/openvla.md"));
});

test("relation validation rejects dangling targets", () => {
  assert.throws(
    () => validateRelations([{ id: "paper:a", relations: [{ target: "model:missing", type: "describes" }] }]),
    /paper:a.*model:missing/,
  );
});

test("Astro schemas retain the evidence enum", async () => {
  const source = await readFile("src/content.config.ts", "utf8");
  assert.match(source, /z\.enum\(\["verified", "self-reported", "unverified"\]\)/);
});
```

- [ ] **Step 2: Run the test and verify the new collection files are absent**

Run: `node --test tests/astro-content.test.mjs`

Expected: FAIL because `src/content/papers/openvla.md` and `validate-relations.mjs` do not exist.

- [ ] **Step 3: Define the content collections**

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const evidence = z.enum(["verified", "self-reported", "unverified"]);
const source = z.object({ label: z.string().min(1), url: z.string().url() });
const relation = z.object({
  target: z.string().regex(/^(paper|model|dataset):[a-z0-9-]+$/),
  type: z.string().min(1),
});
const fact = z.object({
  value: z.number().nullable(),
  unit: z.enum(["billion-parameters", "steps", "trajectories", "episodes", "hours", "tasks", "environments", "embodiments", "percent"]),
  status: evidence,
  source: z.string().url(),
});
const identity = {
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
};
const dated = {
  ...identity,
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().min(1),
};

const papers = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/papers" }),
  schema: z.object({
    ...dated,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    track: z.string().min(1),
    venue: z.string().min(1),
    status: evidence,
    tags: z.array(z.string().min(1)),
    sources: z.array(source).min(1),
    relations: z.array(relation).default([]),
  }),
});

const model = z.object({
  ...dated,
  family: z.string().min(1),
  organization: z.string().min(1),
  license: z.string().min(1),
  protocol: z.string().min(1),
  inputs: z.array(z.string().min(1)).min(1),
  outputs: z.array(z.string().min(1)).min(1),
  facts: z.record(z.string(), fact),
  relations: z.array(relation).default([]),
});

const dataset = z.object({
  ...dated,
  organization: z.string().min(1),
  license: z.string().min(1),
  protocol: z.string().min(1),
  modalities: z.array(z.string().min(1)).min(1),
  facts: z.record(z.string(), fact),
  relations: z.array(relation).default([]),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    ...dated,
    status: z.string().min(1),
    question: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    next: z.string().min(1),
  }),
});

const roadmap = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/roadmap" }),
  schema: z.object({
    ...identity,
    order: z.number().int().positive(),
    label: z.string().min(1),
    duration: z.string().min(1),
    summary: z.string().min(1),
    goals: z.array(z.string().min(1)).min(1),
    outputs: z.array(z.string().min(1)).min(1),
    reading: z.array(z.string().min(1)).min(1),
  }),
});

export const collections = {
  papers,
  models: defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/models" }), schema: model }),
  datasets: defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/datasets" }), schema: dataset }),
  projects,
  roadmap,
};
```

- [ ] **Step 4: Move content and point the existing compiler at the new root**

Run:

```bash
mkdir -p src/content
git mv content/papers src/content/papers
git mv content/models src/content/models
git mv content/datasets src/content/datasets
git mv content/projects src/content/projects
git mv content/roadmap src/content/roadmap
```

In `scripts/build-content.mjs`, replace the default `contentDir` declaration with:

```js
const contentDir = process.env.CONTENT_DIR
  ? path.resolve(process.env.CONTENT_DIR)
  : path.join(root, "src", "content");
```

- [ ] **Step 5: Implement explicit relation validation**

```js
// scripts/validate-relations.mjs
export function validateRelations(nodes) {
  const ids = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    for (const relation of node.relations ?? []) {
      if (!ids.has(relation.target)) throw new Error(`${node.id} references missing relation ${relation.target}`);
    }
  }
  return true;
}
```

Add:

```json
"content:validate": "astro check && node scripts/build-content.mjs && node scripts/build-search-index.mjs && node scripts/build-graph.mjs"
```

- [ ] **Step 6: Validate both Astro and legacy content contracts**

Run: `npm run content:validate && node --test tests/astro-content.test.mjs tests/content-validation.test.mjs tests/search-index.test.mjs tests/knowledge-graph.test.mjs`

Expected: all selected tests pass and generated counts remain `5 papers · 3 roadmap stages · 3 projects · 3 models · 3 datasets`.

- [ ] **Step 7: Commit the single Markdown source migration**

```bash
git add src/content src/content.config.ts scripts tests package.json package-lock.json
git commit -m "refactor: move research content into astro collections"
```

---

### Task 3: Build the static design system and shared Astro shell

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/styles/motion.css`
- Create: `src/layouts/SiteLayout.astro`
- Create: `src/components/static/SiteHeader.astro`
- Create: `src/components/static/SiteFooter.astro`
- Create: `src/components/static/EvidenceBadge.astro`
- Create: `src/components/static/SectionHeading.astro`
- Create: `tests/design-system.test.mjs`

**Interfaces:**
- Consumes: page `title`, `description`, and optional Open Graph metadata.
- Produces: `<SiteLayout title description>`, semantic landmarks, navigation, focus treatment, visual tokens, and reduced-motion defaults.

- [ ] **Step 1: Write the design-system contract test**

```js
// tests/design-system.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the design system exposes required semantic and motion tokens", async () => {
  const tokens = await readFile("src/styles/tokens.css", "utf8");
  const motion = await readFile("src/styles/motion.css", "utf8");
  for (const token of ["--space-void", "--energy-cyan", "--evidence-verified", "--panel-border", "--focus-ring"]) {
    assert.match(tokens, new RegExp(token));
  }
  assert.match(motion, /prefers-reduced-motion:\s*reduce/);
  assert.match(motion, /animation-duration:\s*0\.01ms/);
});
```

- [ ] **Step 2: Run the test and confirm token files are absent**

Run: `node --test tests/design-system.test.mjs`

Expected: FAIL with `ENOENT` for `src/styles/tokens.css`.

- [ ] **Step 3: Add the shared visual tokens**

```css
/* src/styles/tokens.css */
:root {
  color-scheme: dark;
  --space-void: #050812;
  --space-panel: #0b1220;
  --space-panel-raised: #111c2d;
  --text-primary: #eef6ff;
  --text-muted: #8ea2bb;
  --energy-cyan: #48dff6;
  --energy-blue: #4c72ff;
  --signal-amber: #ffb24a;
  --evidence-verified: #45d6a5;
  --evidence-self-reported: #ffb24a;
  --evidence-unverified: #8995a7;
  --panel-border: color-mix(in srgb, var(--energy-cyan) 24%, transparent);
  --focus-ring: #ffcf66;
  --radius-panel: 18px;
  --shadow-glow: 0 0 40px rgb(72 223 246 / 0.12);
  --page-max: 1180px;
  --font-sans: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
  --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
```

```css
/* src/styles/motion.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  [data-motion-only="true"] { display: none !important; }
}
```

- [ ] **Step 4: Implement the semantic site shell**

```astro
---
// src/layouts/SiteLayout.astro
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/motion.css";
import SiteHeader from "../components/static/SiteHeader.astro";
import SiteFooter from "../components/static/SiteFooter.astro";

interface Props { title: string; description: string; image?: string }
const { title, description, image = "/og.png" } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={new URL(image, Astro.site)} />
    <title>{title} · 具身前沿</title>
  </head>
  <body>
    <a class="skip-link" href="#main-content">跳到正文</a>
    <SiteHeader />
    <slot />
    <SiteFooter />
  </body>
</html>
```

`SiteHeader.astro` must render a `<header>`, a home link named `具身前沿`, and a labeled `<nav>` containing links for 论文、模型、数据、图谱、项目、路线、关于. `SiteFooter.astro` must render the repository-content statement and links to `/about/` and the repository URL supplied through `PUBLIC_REPOSITORY_URL`.

- [ ] **Step 5: Add global layout, focus, panel, and responsive styles**

`src/styles/global.css` must define `box-sizing`, body colors and typography, `.page-shell`, `.lab-panel`, `.eyebrow`, `.skip-link`, visible `:focus-visible`, 44 px minimum control size, and a `@media (max-width: 767px)` rule that reduces gutters to 18 px and collapses grids to one column. Use only tokens from `tokens.css` for colors, radii, and glow.

- [ ] **Step 6: Build and run the focused test**

Run: `npm run astro:build && node --test tests/design-system.test.mjs`

Expected: the test passes and Astro reports no invalid component imports.

- [ ] **Step 7: Commit the static design system**

```bash
git add src/styles src/layouts src/components/static tests/design-system.test.mjs
git commit -m "feat: add deep-space research design system"
```

---

### Task 4: Reach route and content equivalence, then retire Vinext

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/pages/about.astro`
- Create: `src/pages/papers/index.astro`
- Create: `src/pages/papers/[slug].astro`
- Create: `src/pages/models.astro`
- Create: `src/pages/datasets.astro`
- Create: `src/pages/graph.astro`
- Create: `src/pages/projects.astro`
- Create: `src/pages/roadmap.astro`
- Create: `src/components/static/{PaperCard,ProjectCard,ResearchTrackCard,ComparisonTable,RelationshipList}.astro`
- Modify: `tests/rendered-html.test.mjs`
- Modify: `tests/source-boundaries.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `eslint.config.mjs`
- Delete after passing equivalence: `app/`, `components/`, `worker/`, `vite.config.ts`, `next.config.ts`, `next-env.d.ts`, `app/chatgpt-auth.ts`

**Interfaces:**
- Consumes: Astro collections and the existing pure search/comparison/graph modules.
- Produces: all required static routes, one generated paper page per entry, and `npm run build` targeting Astro.

- [ ] **Step 1: Rewrite the rendered-output test around static HTML**

```js
// tests/rendered-html.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const required = ["index", "about/index", "papers/index", "models/index", "datasets/index", "graph/index", "projects/index", "roadmap/index", "papers/openvla/index"];

test("Astro emits every public route with one main and one h1", async () => {
  for (const route of required) {
    const html = await readFile(`dist/${route}.html`, "utf8").catch(() => readFile(`dist/${route}/index.html`, "utf8"));
    assert.equal((html.match(/<main\b/g) ?? []).length, 1, route);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, route);
  }
});

test("paper pages expose evidence and source links", async () => {
  const html = await readFile("dist/papers/openvla/index.html", "utf8");
  assert.match(html, /已核验/);
  assert.match(html, /https:\/\/arxiv\.org\//);
});
```

- [ ] **Step 2: Run the test and verify the public Astro routes are missing**

Run: `npm run astro:build && node --test tests/rendered-html.test.mjs`

Expected: FAIL for the first missing required route.

- [ ] **Step 3: Implement collection-backed routes**

Use `getCollection()` on index pages. The dynamic paper page must use this exact route contract:

```astro
---
// src/pages/papers/[slug].astro
import { getCollection, render } from "astro:content";
import SiteLayout from "../../layouts/SiteLayout.astro";
import EvidenceBadge from "../../components/static/EvidenceBadge.astro";

export async function getStaticPaths() {
  const papers = await getCollection("papers");
  return papers.map((paper) => ({ params: { slug: paper.data.slug }, props: { paper } }));
}

const { paper } = Astro.props;
const { Content, headings } = await render(paper);
---
<SiteLayout title={paper.data.title} description={paper.data.summary}>
  <main id="main-content" class="detail-shell">
    <article>
      <header class="detail-header">
        <EvidenceBadge status={paper.data.status} />
        <h1>{paper.data.title}</h1>
        <p>{paper.data.summary}</p>
      </header>
      <div class="prose"><Content /></div>
    </article>
    <aside aria-label="章节与来源">
      <nav aria-label="本页章节"><ul>{headings.filter((h) => h.depth === 2).map((h) => <li><a href={`#${h.slug}`}>{h.text}</a></li>)}</ul></nav>
      <section><h2>来源</h2><ul>{paper.data.sources.map((source) => <li><a href={source.url} rel="noreferrer">{source.label}</a></li>)}</ul></section>
    </aside>
  </main>
</SiteLayout>
```

The other eight pages must preserve the current page titles, summaries, content counts, comparison warning, graph list fallback, and links. Static cards receive records through props and never import content collections directly.

- [ ] **Step 4: Switch the default scripts and remove Worker-only dependencies**

Set scripts to:

```json
{
  "dev": "astro dev",
  "build": "npm run content:build && astro build",
  "preview": "astro preview",
  "test": "npm run build && node --test tests/*.test.mjs",
  "lint": "eslint . --ignore-pattern dist --ignore-pattern generated --ignore-pattern .astro"
}
```

Remove `vinext`, Wrangler, OpenAI Sites, Cloudflare Vite, Next ESLint, RSC and Vite-only packages after deleting their files. Keep the previous `.openai/hosting.json` only as historical deployment metadata until the old site is separately retired.

Replace `eslint.config.mjs` with a flat configuration for JavaScript, TypeScript, and React only:

```js
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", ".astro/**", "generated/**", "src/components/vendor/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { react, "react-hooks": hooks, "jsx-a11y": jsxA11y },
    settings: { react: { version: "detect" } },
    rules: {
      ...hooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
  },
);
```

- [ ] **Step 5: Run route equivalence and full tests before deleting legacy code**

Run: `npm test && npm run lint`

Expected: all tests pass on Astro output, all nine route families build, and generated content/graph counts remain unchanged.

- [ ] **Step 6: Delete the legacy runtime and rerun the same gate**

Run:

```bash
git rm -r app components worker
git rm vite.config.ts next.config.ts next-env.d.ts
npm test
npm run lint
```

Expected: the same tests pass without Vinext, Next or Worker files.

- [ ] **Step 7: Commit the static-site cutover**

```bash
git add package.json package-lock.json src tests scripts .openai/hosting.json
git commit -m "feat: migrate research routes to astro"
```

---

### Task 5: Restore search and add the licensed research-console island

**Files:**
- Move: `lib/search-core.mjs` to `src/lib/search-core.mjs`
- Move: `lib/search-core.d.mts` to `src/lib/search-core.d.mts`
- Create: `src/components/islands/PaperExplorer.tsx`
- Create: `src/styles/research-console.css`
- Modify: `src/pages/papers/index.astro`
- Modify: `tests/search-index.test.mjs`
- Create: `tests/paper-explorer-static.test.mjs`

**Interfaces:**
- Consumes: `SearchRecord[]`, paper display records, and `SearchFilters` from `src/lib/search-core.mjs`.
- Produces: `<PaperExplorer client:load>` with URL-synchronized filters and a complete no-JavaScript list rendered by Astro.

- [ ] **Step 1: Add the static-fallback contract test**

```js
// tests/paper-explorer-static.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("papers remain discoverable before the search island hydrates", async () => {
  const html = await readFile("dist/papers/index.html", "utf8");
  for (const title of ["OpenVLA", "RT-2", "π0"]) assert.match(html, new RegExp(title));
  assert.match(html, /<noscript>[\s\S]*完整论文列表/);
  assert.match(html, /全文检索/);
});
```

- [ ] **Step 2: Verify the test fails on the noninteractive papers page**

Run: `npm run build && node --test tests/paper-explorer-static.test.mjs`

Expected: FAIL because the Research Console and `<noscript>` copy are absent.

- [ ] **Step 3: Implement the React island using the existing pure search API**

`PaperExplorer.tsx` must preserve these controls and update rules:

```ts
type Filters = { query?: string; track?: string; tag?: string; year?: string; venue?: string; status?: string };

function replaceUrl(filters: Filters) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value).map(([key, value]) => [key, value!]))
  history.replaceState(null, "", params.size ? `${location.pathname}?${params}` : location.pathname);
}
```

Render one search input, five labeled selects, a clear button, an `aria-live="polite"` result count, and grouped result cards. Filtering must call the existing `searchRecords(index, filters)` implementation rather than reimplementing matching rules in the component.

- [ ] **Step 4: Mount the island while retaining the static list**

```astro
<PaperExplorer client:load papers={paperRecords} index={searchIndex} initialFilters={{}} />
<noscript>
  <h2>完整论文列表</h2>
  <div class="paper-grid"><!-- render every PaperCard here --></div>
</noscript>
```

- [ ] **Step 5: Run search, build, and static-fallback tests**

Run: `npm run build && node --test tests/search-index.test.mjs tests/paper-explorer-static.test.mjs`

Expected: all tests pass; Chinese and English search remain case-insensitive and combined filters remain intersections.

- [ ] **Step 6: Commit the research console**

```bash
git add src/lib src/components/islands/PaperExplorer.tsx src/styles/research-console.css src/pages/papers/index.astro tests
git commit -m "feat: add static-first paper research console"
```

---

### Task 6: Integrate licensed text and background effects

**Files:**
- Create: `components.json`
- Create from upstream registry: `src/components/vendor/react-bits/{Shuffle,DotGrid,GridDistortion}/**`
- Create: `src/components/islands/HeroExperience.tsx`
- Create: `src/styles/hero.css`
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `src/pages/index.astro`
- Create: `tests/visual-license.test.mjs`
- Create: `tests/hero-fallback.test.mjs`

**Interfaces:**
- Consumes: licensed React Bits components, `matchMedia`, pointer capability, and hero copy rendered by Astro.
- Produces: `<HeroExperience client:idle>` that decorates, but never owns, the heading and primary navigation content.

- [ ] **Step 1: Add provenance and fallback tests**

```js
// tests/visual-license.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("vendored visual code records its upstream and license", async () => {
  const notices = await readFile("THIRD_PARTY_NOTICES.md", "utf8");
  assert.match(notices, /DavidHDev\/react-bits/);
  assert.match(notices, /MIT \+ Commons Clause/);
  for (const name of ["Shuffle", "DotGrid", "GridDistortion"]) assert.match(notices, new RegExp(name));
});
```

```js
// tests/hero-fallback.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("hero meaning is present without hydration", async () => {
  const html = await readFile("dist/index.html", "utf8");
  assert.match(html, /把具身智能研究/);
  assert.match(html, /进入论文档案/);
  assert.match(html, /data-static-hero/);
});
```

- [ ] **Step 2: Run tests and verify notices and hero fallback are missing**

Run: `node --test tests/visual-license.test.mjs tests/hero-fallback.test.mjs`

Expected: both tests fail.

- [ ] **Step 3: Configure the official React Bits registry and import pinned components**

Create `components.json` with the React Bits registry URL documented by its upstream, TypeScript, CSS styling, and `@/components` alias. Run:

```bash
npx shadcn@latest add @react-bits/Shuffle-TS-CSS @react-bits/DotGrid-TS-CSS @react-bits/GridDistortion-TS-CSS
```

Immediately record the exact upstream commit returned by the downloaded registry metadata and the generated local paths in `THIRD_PARTY_NOTICES.md`. Do not use the Vue ports from the reference site.

- [ ] **Step 4: Build one orchestrator with explicit capability gates**

```tsx
// src/components/islands/HeroExperience.tsx
import { lazy, Suspense, useEffect, useState } from "react";
import DotGrid from "../vendor/react-bits/DotGrid/DotGrid";

const GridDistortion = lazy(() => import("../vendor/react-bits/GridDistortion/GridDistortion"));

export default function HeroExperience() {
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(pointer: fine)").matches;
    setEnhanced(!reduced && finePointer && innerWidth >= 768);
  }, []);
  return (
    <div className="hero-experience" aria-hidden="true" data-motion-only="true">
      <DotGrid dotSize={2} gap={22} baseColor="#18314d" activeColor="#48dff6" proximity={140} shockRadius={180} />
      {enhanced && <Suspense fallback={null}><GridDistortion imageSrc="/hero-static.webp" grid={18} mouse={0.1} strength={0.12} relaxation={0.92} /></Suspense>}
    </div>
  );
}
```

The visible `<h1>`, summary, and links remain in `index.astro` under `data-static-hero`; `Shuffle` may decorate a duplicate `aria-hidden` eyebrow only and must not replace selectable heading text.

- [ ] **Step 5: Add static hero artwork with documented ownership**

Create `public/hero-static.webp` from an original procedural gradient and orbital-line composition. Add its authoring note and SHA-256 to `THIRD_PARTY_NOTICES.md` under `First-party assets`; do not use the reference site's hero image or robot model.

- [ ] **Step 6: Build and run the provenance/fallback tests**

Run: `npm run build && node --test tests/visual-license.test.mjs tests/hero-fallback.test.mjs`

Expected: both tests pass; the homepage HTML includes readable hero content before JavaScript.

- [ ] **Step 7: Commit licensed visual effects**

```bash
git add components.json src/components/vendor src/components/islands/HeroExperience.tsx src/styles/hero.css src/pages/index.astro public/hero-static.webp THIRD_PARTY_NOTICES.md tests
git commit -m "feat: add licensed interactive hero effects"
```

---

### Task 7: Add the procedural Three.js embodiment island

**Files:**
- Create: `src/components/islands/EmbodimentUnit.tsx`
- Create: `src/lib/three/create-embodiment-scene.ts`
- Create: `src/styles/embodiment-unit.css`
- Modify: `src/components/islands/HeroExperience.tsx`
- Modify: `THIRD_PARTY_NOTICES.md`
- Create: `tests/embodiment-gates.test.mjs`

**Interfaces:**
- Consumes: a canvas element, `IntersectionObserver`, document visibility, pointer position, and reduced-motion/device gates.
- Produces: `createEmbodimentScene(canvas): { setPointer(x, y): void; setVisible(value): void; resize(): void; dispose(): void }` and a lazy desktop-only React island.

- [ ] **Step 1: Write the capability and cleanup contract test**

```js
// tests/embodiment-gates.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the embodiment island gates loading and exposes cleanup", async () => {
  const component = await readFile("src/components/islands/EmbodimentUnit.tsx", "utf8");
  const scene = await readFile("src/lib/three/create-embodiment-scene.ts", "utf8");
  assert.match(component, /min-width:\s*768px/);
  assert.match(component, /prefers-reduced-motion/);
  assert.match(component, /IntersectionObserver/);
  assert.match(scene, /dispose\(\)/);
  assert.match(scene, /renderer\.forceContextLoss/);
});
```

- [ ] **Step 2: Run the test and verify the island is absent**

Run: `node --test tests/embodiment-gates.test.mjs`

Expected: FAIL with `ENOENT`.

- [ ] **Step 3: Install Three.js and record its MIT notice**

Run: `npm install three@latest`

Append Three.js package version, repository URL, copyright, MIT license, and local consumer files to `THIRD_PARTY_NOTICES.md`.

- [ ] **Step 4: Implement a first-party procedural embodiment**

`create-embodiment-scene.ts` must construct the figure from primitives only: one capsule torso, a sphere head, paired cylinder upper/lower arms, paired cylinder upper/lower legs, and emissive joint spheres. It must use an orthographic camera, one white key light, one cyan rim light, transparent renderer, pixel ratio capped at 2, and no external GLB or textures.

Its returned `dispose()` must cancel animation, dispose every geometry and material, dispose the renderer, call `renderer.forceContextLoss()`, and remove its canvas listeners. Rendering must occur only while visible or while easing toward a pointer target.

- [ ] **Step 5: Implement the React lifecycle and gates**

`EmbodimentUnit.tsx` must:

1. Render a static `<picture>` fallback first.
2. Require `(min-width: 768px) and (pointer: fine)` and reject reduced motion before dynamically importing the scene module.
3. Create an `IntersectionObserver` and pass visibility to the scene.
4. Pause on `document.hidden`.
5. Call `dispose()` in the effect cleanup.
6. Replace the canvas with the fallback if WebGL initialization throws.

- [ ] **Step 6: Run the focused test and production build**

Run: `node --test tests/embodiment-gates.test.mjs && npm run build`

Expected: the test passes and the Astro build emits Three.js in a lazy chunk rather than the shared entry.

- [ ] **Step 7: Commit the procedural embodiment**

```bash
git add package.json package-lock.json src/components/islands src/lib/three src/styles/embodiment-unit.css THIRD_PARTY_NOTICES.md tests/embodiment-gates.test.mjs
git commit -m "feat: add procedural three-dimensional embodiment"
```

---

### Task 8: Add the optional Cytoscape knowledge-graph island

**Files:**
- Move: `lib/graph-core.mjs` to `src/lib/graph-core.mjs`
- Move: `lib/graph-core.d.mts` to `src/lib/graph-core.d.mts`
- Create: `src/components/islands/KnowledgeGraph.tsx`
- Create: `src/components/islands/KnowledgeMap.tsx`
- Create: `src/styles/knowledge-graph.css`
- Modify: `src/pages/graph.astro`
- Modify: `THIRD_PARTY_NOTICES.md`
- Modify: `tests/knowledge-graph.test.mjs`

**Interfaces:**
- Consumes: `KnowledgeGraphData` and the complete static `RelationshipList`.
- Produces: an explicit load button, node search, track clustering, neighbor highlight, and path navigation without removing the list fallback.

- [ ] **Step 1: Extend the graph test with lazy-load and fallback assertions**

```js
test("graph HTML keeps the complete list and defers Cytoscape", async () => {
  const html = await readFile("dist/graph/index.html", "utf8");
  assert.match(html, /完整关系清单/);
  assert.match(html, /加载交互图谱/);
  assert.doesNotMatch(html, /cytoscape[^<]*\.js/);
});
```

- [ ] **Step 2: Run the graph test and verify the new control is absent**

Run: `npm run build && node --test tests/knowledge-graph.test.mjs`

Expected: FAIL because the explicit load button is absent.

- [ ] **Step 3: Install Cytoscape and record its MIT notice**

Run: `npm install cytoscape@latest`

Append package version, repository URL, copyright, MIT license, and local consumer files to `THIRD_PARTY_NOTICES.md`.

- [ ] **Step 4: Implement explicit lazy loading**

`KnowledgeGraph.tsx` initially renders only explanatory copy and a `加载交互图谱` button. On click it dynamically imports `KnowledgeMap.tsx`. `KnowledgeMap.tsx` dynamically imports `cytoscape`, creates the graph from supplied nodes/edges, exposes a labeled node-search input and track filter, and destroys the Cytoscape instance in cleanup.

The graph styles must provide 44 px controls, visible focus, high-contrast labels, a fixed minimum height of 520 px on desktop and 420 px on mobile, and no information available exclusively through hover.

- [ ] **Step 5: Build and verify static HTML and graph behavior contracts**

Run: `npm run build && node --test tests/knowledge-graph.test.mjs tests/rendered-html.test.mjs`

Expected: tests pass, the static list is in HTML, and Cytoscape is emitted only as an async asset.

- [ ] **Step 6: Commit the graph island**

```bash
git add package.json package-lock.json src/lib/graph-core* src/components/islands/KnowledgeGraph.tsx src/components/islands/KnowledgeMap.tsx src/styles/knowledge-graph.css src/pages/graph.astro THIRD_PARTY_NOTICES.md tests
git commit -m "feat: add optional interactive knowledge graph"
```

---

### Task 9: Add reading tools and evidence-aware comparison visuals

**Files:**
- Move: `lib/comparison-core.mjs` to `src/lib/comparison-core.mjs`
- Create: `src/components/islands/ReadingProgress.tsx`
- Create: `src/components/islands/EvidenceLens.tsx`
- Create: `src/components/static/ProtocolLock.astro`
- Modify: `src/components/static/ComparisonTable.astro`
- Modify: `src/pages/models.astro`
- Modify: `src/pages/datasets.astro`
- Modify: `src/pages/papers/[slug].astro`
- Create: `tests/reading-and-comparison.test.mjs`

**Interfaces:**
- Consumes: normalized comparison fields and article headings/evidence states.
- Produces: protocol-compatible sorting only, reading progress, and an evidence-emphasis control that never hides article content.

- [ ] **Step 1: Write evidence and protocol-lock tests**

```js
// tests/reading-and-comparison.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("comparison pages explain incompatible protocols", async () => {
  const html = await readFile("dist/models/index.html", "utf8");
  assert.match(html, /协议一致性锁/);
  assert.match(html, /不可排序/);
});

test("paper pages expose progressive reading tools without hiding prose", async () => {
  const html = await readFile("dist/papers/openvla/index.html", "utf8");
  assert.match(html, /阅读进度/);
  assert.match(html, /证据透镜/);
  assert.match(html, /class="prose"/);
});
```

- [ ] **Step 2: Run the test and verify the new tools are absent**

Run: `npm run build && node --test tests/reading-and-comparison.test.mjs`

Expected: both tests fail.

- [ ] **Step 3: Implement the protocol lock around the existing comparison rule**

`ProtocolLock.astro` receives `{ compatible: boolean, explanation: string }`. When false, it renders `协议一致性锁：不可排序` and the exact protocol mismatch. `ComparisonTable.astro` may render a sorting control only when `canRankFields(fields)` from `src/lib/comparison-core.mjs` returns true.

- [ ] **Step 4: Implement reading progress and the evidence lens**

`ReadingProgress.tsx` reads the article scroll range and writes `scaleX(progress)` to an element labeled `阅读进度`; it uses one passive scroll listener throttled by `requestAnimationFrame` and removes both on cleanup.

`EvidenceLens.tsx` renders three buttons: 全部证据、突出已核验、突出待核. It toggles a `data-evidence-lens` attribute on the nearest article. CSS may reduce nonselected badge opacity to 0.45 but must not hide paragraphs, headings, figures, source links, or table rows.

- [ ] **Step 5: Build and run comparison regressions**

Run: `npm run build && node --test tests/reading-and-comparison.test.mjs tests/comparison-content.test.mjs`

Expected: all tests pass; incompatible metrics remain unranked.

- [ ] **Step 6: Commit the research reading tools**

```bash
git add src/lib/comparison-core.mjs src/components src/pages src/styles tests
git commit -m "feat: add evidence-aware reading and comparison tools"
```

---

### Task 10: Enforce bundle, link, accessibility, and browser gates

**Files:**
- Create: `scripts/check-bundle-budget.mjs`
- Create: `scripts/check-static-site.mjs`
- Modify: `scripts/browser-qa.mjs`
- Create: `tests/bundle-budget.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `dist/` and a locally served production build.
- Produces: `npm run verify`, deterministic route/link/landmark checks, gzip budget enforcement, and desktop/mobile/reduced-motion browser evidence.

- [ ] **Step 1: Write the bundle-budget test**

```js
// tests/bundle-budget.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { checkBundleBudget } from "../scripts/check-bundle-budget.mjs";

test("initial interactive assets stay under 120 KB gzip", async () => {
  const report = await checkBundleBudget("dist");
  assert.ok(report.initialInteractiveGzip <= 120 * 1024, JSON.stringify(report));
  assert.equal(report.sharedIncludesThree, false);
  assert.equal(report.sharedIncludesCytoscape, false);
});
```

- [ ] **Step 2: Run the test and verify the checker is absent**

Run: `node --test tests/bundle-budget.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement deterministic static checks**

`check-static-site.mjs` must parse every HTML file under `dist`, fail on missing internal targets, multiple or missing `<main>`/`<h1>`, missing image alt attributes, `javascript:` URLs, or an interactive control without an accessible name. It prints exact file paths and selectors.

`check-bundle-budget.mjs` must read Astro's manifest and emitted assets, gzip each initial island entry, exclude lazy Three.js/Cytoscape chunks by import graph rather than filename alone, and return:

```ts
type BundleReport = {
  initialInteractiveGzip: number;
  sharedIncludesThree: boolean;
  sharedIncludesCytoscape: boolean;
  assets: Array<{ path: string; gzip: number; initial: boolean }>;
};
```

- [ ] **Step 4: Extend browser QA to three capability profiles**

`scripts/browser-qa.mjs` must verify:

1. Desktop 1440×900: hero effects initialize, search filters update URL, graph loads after click, no console errors.
2. Mobile 360×800 with touch: no horizontal overflow, no Three.js request, all controls at least 44×44 px.
3. Desktop reduced motion: static hero visible, no continuous animations, all research functions usable.

Save screenshots under `artifacts/browser-qa/` and a JSON report containing route, viewport, assertions, console errors, and timestamp.

- [ ] **Step 5: Add the unified verification command**

```json
"verify": "npm run test && npm run lint && node scripts/check-static-site.mjs && node scripts/check-bundle-budget.mjs"
```

- [ ] **Step 6: Run all local quality gates**

Run: `npm run verify`

Expected: all tests and lint pass, static links/landmarks pass, interactive gzip is at most 122880 bytes, and shared bundles exclude Three.js and Cytoscape.

Run browser QA against a local production server:

```bash
npm run preview -- --host 127.0.0.1
npm run qa:browser -- --base-url http://127.0.0.1:4321
```

Expected: all three browser profiles pass and screenshots/report are generated.

- [ ] **Step 7: Commit the quality gates**

```bash
git add scripts tests package.json artifacts/browser-qa
git commit -m "test: enforce visual performance and accessibility gates"
```

---

### Task 11: Add the GitHub pull-request and Pages delivery pipeline

**Files:**
- Modify: `.github/workflows/verify.yml`
- Create: `.github/workflows/deploy-pages.yml`
- Create: `.github/pull_request_template.md`
- Create: `.github/CODEOWNERS`
- Create: `scripts/write-codeowners.mjs`
- Modify: `README.md`
- Create: `tests/github-workflow.test.mjs`

**Interfaces:**
- Consumes: `npm run verify`, the Astro `dist/` directory, and repository Pages settings.
- Produces: required PR check `verify`, Pages artifact deployment from `main`, review templates, and repository setup instructions.

- [ ] **Step 1: Write workflow policy tests**

```js
// tests/github-workflow.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("verification runs on pull requests without write permissions", async () => {
  const yaml = await readFile(".github/workflows/verify.yml", "utf8");
  assert.match(yaml, /pull_request:/);
  assert.match(yaml, /npm run verify/);
  assert.match(yaml, /contents:\s*read/);
  assert.doesNotMatch(yaml, /pages:\s*write/);
});

test("Pages deploys only from main with official artifact actions", async () => {
  const yaml = await readFile(".github/workflows/deploy-pages.yml", "utf8");
  assert.match(yaml, /branches:\s*\[main\]/);
  assert.match(yaml, /actions\/upload-pages-artifact@v4/);
  assert.match(yaml, /actions\/deploy-pages@v4/);
  assert.match(yaml, /environment:[\s\S]*github-pages/);
});
```

- [ ] **Step 2: Run the workflow tests and verify deploy workflow is absent**

Run: `node --test tests/github-workflow.test.mjs`

Expected: FAIL with `ENOENT` for `deploy-pages.yml`.

- [ ] **Step 3: Upgrade the PR verification workflow**

`.github/workflows/verify.yml` must use `actions/checkout@v4`, `actions/setup-node@v4` with Node 22 and npm cache, `npm ci`, and `npm run verify`. Permissions remain `contents: read`. Upload `dist/` and `artifacts/browser-qa/` as nonproduction artifacts when the job succeeds.

- [ ] **Step 4: Add the Pages workflow**

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - uses: actions/configure-pages@v5
        id: pages
      - run: npm ci
      - run: npm run verify
        env:
          SITE_URL: ${{ steps.pages.outputs.origin }}
          BASE_PATH: ${{ steps.pages.outputs.base_path }}
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 5: Generate review ownership from the real GitHub remote and add PR evidence fields**

Create the generator:

```js
// scripts/write-codeowners.mjs
import { writeFile } from "node:fs/promises";

const owner = process.argv[2];
if (!/^@[A-Za-z0-9-]+$/.test(owner ?? "")) {
  throw new Error("usage: node scripts/write-codeowners.mjs @github-owner");
}
await writeFile(
  ".github/CODEOWNERS",
  `* ${owner}\nsrc/content/ ${owner}\n.github/workflows/ ${owner}\nsrc/components/islands/ ${owner}\nsrc/components/vendor/ ${owner}\n`,
  "utf8",
);
```

Resolve the actual owner and generate the file:

```bash
repo_owner=$(gh repo view --json owner -q .owner.login)
node scripts/write-codeowners.mjs "@$repo_owner"
```

Expected: `.github/CODEOWNERS` contains the real repository owner. If `gh repo view` reports that no repository is configured, stop this task and request the GitHub repository URL; do not write a guessed handle.

The PR template contains checkboxes for content sources, evidence status, third-party license, desktop screenshot, mobile screenshot, reduced-motion result, `npm run verify`, and deployment impact.

README must document clone/install/dev, content directories, branch/PR flow, Pages setup, required `verify` status, manual review policy, and the fact that a local build is not deployment evidence.

- [ ] **Step 6: Run workflow tests and YAML-aware review**

Run: `node --test tests/github-workflow.test.mjs && npm run verify`

Expected: workflow tests and all project gates pass.

- [ ] **Step 7: Commit the GitHub-first delivery pipeline**

```bash
git add .github README.md tests/github-workflow.test.mjs
git commit -m "ci: add pull-request and github pages delivery"
```

---

### Task 12: Perform final local acceptance and prepare the review branch

**Files:**
- Modify only if evidence reveals a defect: files owned by the failing task.
- Create: `docs/verification/2026-08-18-github-visual-migration.md`

**Interfaces:**
- Consumes: the complete migrated repository and all gates.
- Produces: one evidence report, a clean review branch, and the exact push/PR handoff without claiming remote deployment.

- [ ] **Step 1: Run the complete clean-room verification**

Run:

```bash
npm ci
npm run verify
```

Expected: dependency install uses the lockfile; every test, lint, static-site, accessibility, link, and bundle check passes.

- [ ] **Step 2: Run production browser verification**

Start `npm run preview -- --host 127.0.0.1`, run `npm run qa:browser -- --base-url http://127.0.0.1:4321`, and verify desktop, mobile touch, and reduced-motion reports contain zero failed assertions and zero unhandled console errors.

- [ ] **Step 3: Audit source and license boundaries**

Run:

```bash
rg -n "ZhuYun97|embodied-ai-learning|hero-bg\.jpg|model\.glb" src public THIRD_PARTY_NOTICES.md
npm ls --all
git diff main...HEAD --stat
```

Expected: references to the reference site occur only in design/provenance documentation; forbidden assets are absent; every runtime dependency is resolved; diff is limited to the research-station migration.

- [ ] **Step 4: Write the evidence report**

The report must contain four separate sections:

1. Source audit: changed architecture, third-party sources, licenses, and absence of copied reference assets.
2. Build verification: exact command, pass/fail counts, content counts, and bundle report.
3. Browser verification: tested viewports/capabilities, screenshots, console result, and remaining visual risks.
4. Deployment status: GitHub remote, PR URL, Actions URL, Pages URL, and online smoke results; fields remain `not executed` until each external action actually succeeds.

- [ ] **Step 5: Commit the verification report**

```bash
git add docs/verification/2026-08-18-github-visual-migration.md
git commit -m "docs: record visual migration verification"
```

- [ ] **Step 6: Confirm a clean branch ready for remote review**

Run:

```bash
git status --short
git log --oneline main..HEAD
git diff --check main...HEAD
```

Expected: clean status, the planned sequence of reviewable commits, and no whitespace errors.

- [ ] **Step 7: Push and open a pull request only after a GitHub remote exists**

Run:

```bash
git push -u origin feat/github-visual-system
gh pr create --base main --head feat/github-visual-system --title "feat: migrate research station to GitHub-first visual architecture" --body-file .github/pull_request_template.md
```

Expected: GitHub returns a PR URL. Do not merge it automatically; wait for checks and manual review. If `origin` is absent, stop with the exact missing GitHub repository URL rather than creating or guessing a remote.
