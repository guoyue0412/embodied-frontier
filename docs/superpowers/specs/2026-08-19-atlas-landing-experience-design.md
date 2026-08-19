# Atlas Landing Experience Design

Date: 2026-08-19
Status: Approved for implementation by the user's instruction to reproduce the reference landing experience and execute until the agreed effect is reached.

## Objective

Transform the existing homepage from a conventional research landing page into an immersive, operable embodied-AI atlas. Match the reference site's information density, spatial hierarchy, and interaction rhythm without copying its unlicensed code, text, data, or visual assets. Add a first-class Demo Lab tab for anonymized, user-approved demonstrations of practical work.

The landing page must remain an independent design whose facts come exclusively from this repository's typed Markdown collections.

## Considered approaches

1. Cosmetic reskin: retain the current layout and add more glow/HUD effects. Low risk, but it would not reproduce the reference site's atlas-like navigation or information density.
2. Atlas shell reconstruction: rebuild the homepage around a full-viewport command deck, system status, live repository metrics, an orbital navigator, and VLA/WAM/Data research lanes. This is the selected approach because it changes the interaction model rather than merely decorating the current hero.
3. Full WebGL HUD: render the entire first viewport as a 3D scene. Visually dramatic, but it would violate mobile, accessibility, progressive-enhancement, and bundle constraints.

## Information architecture

### Global atlas shell

- Preserve the existing accessible site header and skip link, but give the homepage an atlas mode with a compact system rail.
- Desktop uses a left-side indexed rail for Atlas, Navigator, VLA, WAM, Data/Eval, Demo Lab, and Method.
- Mobile uses a horizontally scrollable jump rail; no off-canvas dependency is required.
- A top status line exposes repository-backed counts, content provenance, current year, and Git/Markdown status.
- The global site header exposes `Demo Lab / 作品实验室` as a primary tab, and the Atlas navigator links to the same destination.

### Full-viewport command deck

- Minimum desktop height is the visible viewport below the global header.
- Left column contains bilingual identity, one concise thesis, three primary actions, and live counts from Markdown.
- Right column contains the existing static embodied artwork and optional visual runtime, framed as an Embodied Unit rather than a decorative background.
- A compact scale panel shows paper, project, model, dataset, and research-lane counts; no borrowed or invented reference-site numbers are allowed.
- Below the primary copy, an indexed chapter strip communicates the page sequence.

### Research navigator

- A static-first orbital navigator exposes seven destinations: papers, models, datasets, graph, roadmap, projects, and Demo Lab.
- On capable desktop devices, an island may add orbit motion, active-node preview, pause/resume, keyboard arrows, and pointer focus.
- Without JavaScript, every destination remains a normal visible link.
- Reduced-motion mode freezes the orbit into a deterministic radial/static layout.

### Research lanes

- VLA, WAM, and Data/Eval become separate full-width chapters.
- Each lane begins with the research question, inputs/outputs, boundaries, and repository-derived linked records.
- Cards use the existing spotlight/depth treatment with restrained atlas indexing.
- WAM is a conceptual research lane; only records actually present in Markdown are shown. Empty categories explain the coverage gap instead of inventing content.

### Method and evidence

- The lower page retains recent notes, learning path, active work, and evidence-first method, but consolidates them into denser atlas panels.
- Evidence status and field provenance remain visible and unchanged.

### Demo Lab / 作品实验室

- `/demos/` is a first-class gallery and `/demos/[slug]/` is an individual case-study page.
- The public presentation is organized around the problem, the user's role, visible contribution, technical stack, demo, constraints, and evidence. It does not present an employment timeline or identify an internship company.
- Demo records come from a typed `demos` Markdown collection. Until the user supplies and approves a record and its assets, the gallery renders an explicit empty state; sample companies, outcomes, metrics, or screenshots must never be invented.
- Public frontmatter accepts `title`, `slug`, `role`, optional broad `period`, `summary`, `contributions`, `stack`, optional `video`, `evidence`, `sources`, `anonymized`, `disclosure`, `mediaRights`, and `public`. It explicitly rejects `company`, `employer`, and `client` fields.
- Every published record requires `anonymized: true`, `public: true`, a visible disclosure, at least one contribution, at least one evidence item, and confirmed media rights.
- The required disclosure communicates: `本页面为个人参与项目的匿名化演示或独立重建，不包含实习公司的名称、内部代码、私有数据和未公开产品信息，也不代表原公司的官方实现。`
- Before publication, assets and copy are checked for company logos, domains, repository paths, internal UI, customer or colleague information, faces and badges, tokens, IP addresses, model/checkpoint names, internal benchmarks, unapproved metrics, and EXIF metadata.

### Demo video delivery

- Demo video is an enhancement to the written case study, not its only evidence. The title, summary, contribution, poster, and controls remain useful when playback is unavailable.
- Small public WebM/MP4 files live under `public/videos/` as normal Git files and are referenced through the base-path helper. Git LFS is not used because GitHub Pages cannot serve LFS objects as normal page assets.
- Every video uses `controls`, `playsinline`, `preload="metadata"`, a poster, and an accessible label. Captions are required when speech or meaningful audio is present. Autoplay, forced looping, and background video are not used.
- Large media that would make the repository or Pages delivery impractical moves to user-controlled object storage/CDN while the Markdown record retains provenance and ownership metadata.
- Arbitrary iframe embeds are disabled by default. A future provider-specific embed requires a separate privacy, CSP, accessibility, and fallback review.

## Visual system

- Palette: deep navy/black, cold cyan, electric blue, and one amber index accent.
- Geometry: thin technical rules, square/low-radius panels, concentric SVG rings, coordinate labels, and restrained scanline/grid texture.
- Type: large bilingual display title, compact monospace instrumentation, readable Chinese body text.
- Motion: purposeful entrance, orbit drift, pointer spotlight, and subtle depth. No continuous animation when offscreen or document-hidden.
- The existing first-party hero artwork, React Bits-derived licensed effects, and procedural Three.js embodiment unit may be reused under their existing provenance notices.

## Component boundaries

- `AtlasHero.astro`: semantic first viewport, repository metrics, actions, chapter strip, and static fallback.
- `AtlasRail.astro`: desktop/mobile in-page navigation with current-section semantics.
- `AtlasNavigator.tsx`: optional progressive orbit controls; receives only route labels and base-safe URLs.
- `ResearchLane.astro`: reusable static lane for VLA, WAM, and Data/Eval.
- `AtlasMetric.astro`: one live repository count with accessible label.
- `DemoCard.astro`: one gallery entry built only from validated Demo Markdown.
- `DemoVideo.astro`: base-safe, accessible WebM/MP4 rendering with poster and optional captions.
- Existing `HeroExperience`, cards, evidence components, and typed collections remain independent consumers.

## Data flow

1. Astro reads papers, models, datasets, projects, roadmap, and public Demo collections at build time.
2. The page derives counts and lane membership from collection frontmatter.
3. Static components render the complete meaningful homepage.
4. The navigator island receives a small serialized list of labels and routes; it does not fetch runtime content.
5. All internal URLs pass through the existing base-path helper.
6. Demo pages render only records with `public: true`; media paths are validated at build time and passed to `DemoVideo` rather than injected as raw HTML.

## Accessibility and fallbacks

- Exactly one `main` and one `h1`.
- Landmarks and chapter anchors are keyboard reachable.
- Navigator nodes are links/buttons with at least 44×44 targets and visible focus.
- The static link grid is the source of truth; animation only enhances it.
- Mobile under 768px and touch devices do not download Three.js.
- `prefers-reduced-motion` removes orbit/entrance movement while preserving hierarchy.
- Contrast, no-JS visibility, overflow, focus order, and screen-reader names are browser-gated.
- Demo videos are keyboard operable, never autoplay, and retain written/poster fallbacks. The gallery remains complete with JavaScript disabled.

## Performance

- Initial interactive JavaScript remains below the existing 120 KiB gzip gate.
- Atlas navigation adds no new third-party runtime dependency.
- Existing Three.js and Cytoscape chunks retain their current lazy boundaries.
- Decorative SVG/CSS remains inline or first-party and deterministic.
- Demo videos use metadata-only preload. Listing pages render posters, not multiple playable video elements.

## Verification and acceptance

The implementation is accepted only when:

- Desktop screenshot reads as an atlas command deck rather than the previous generic landing page.
- The first viewport contains system status, bilingual identity, repository metrics, embodied unit, primary routes, and page chapter navigation.
- Navigator destinations are fully usable with mouse, keyboard, touch, reduced motion, and no JavaScript.
- VLA, WAM, and Data/Eval lanes are visible on the homepage and contain only repository-backed records.
- Demo Lab is reachable from the global header and Atlas navigator, and its gallery/detail routes work under both supported base paths.
- No Demo page publishes a forbidden organization field or unapproved record; the empty state is accepted when no approved Demo exists.
- Video checks confirm base-safe sources, poster fallback, controls, no autoplay, optional captions, and no Git LFS pointer files under `public/videos/`.
- 1440×900 and 360×800 have no horizontal overflow or clipped primary controls.
- Root and `/embodied-frontier/` production verification pass.
- Three.js remains absent from mobile/touch network evidence and Cytoscape remains absent until graph activation.
- New browser screenshots are visually inspected and committed.
- Independent review reports no Critical or Important findings before updating the PR.

## Delivery boundary

Implementation updates the existing `feat/github-visual-system` branch and PR #1. It must not merge the PR or deploy Pages. Human review remains the merge gate.
