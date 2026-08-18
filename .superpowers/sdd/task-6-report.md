# Task 6 Report: Integrate licensed text and background effects

Status: DONE

- Base SHA: `4ebc4b7248969c64f30ff5860d7527949ca77a3d`
- Implementation commit: `17c4046` (`feat: add licensed interactive hero effects`)
- Scope: licensed React Bits hero effects, original static hero artwork, static-first Astro fallback, capability/reduced-motion gates, base-path-safe asset handling, provenance notices, and focused regression tests.

## Provenance and license

- React Bits sources were obtained from the official registry at `https://reactbits.dev/r/{name}.json` and vendored under `src/components/vendor/react-bits/`.
- The recorded upstream React Bits repository revision is `4e0e030193b563be6be33d928f77d0d01cefe237`: [DavidHDev/react-bits commit](https://github.com/DavidHDev/react-bits/commit/4e0e030193b563be6be33d928f77d0d01cefe237).
- The notice records the upstream `MIT + Commons Clause` terms and identifies the vendored `Shuffle`, `DotGrid`, and `GridDistortion` TS/CSS sources. `Shuffle` remains an available licensed source but is not mounted in the hero, avoiding unnecessary client JavaScript while preserving the static heading.
- Runtime dependencies and licenses are recorded for `gsap@3.15.0`, `@gsap/react@2.1.2`, and lazy-only `three@0.180.0`; `@types/three@0.180.0` is a development-only type dependency.
- `public/hero-static.webp` is first-party artwork generated for this task, with no copied reference-site asset, logo, or text. SHA-256: `09df95ec29889453ce74223fb232ee930b7b6b040f045be507ee8497edd229f7`.

## Static fallback and runtime gates

- The readable hero heading, summary, and `进入论文档案` link remain server-rendered semantic HTML under `<section data-static-hero>`.
- The static artwork is a normal `<img>` with an empty alt and `aria-hidden="true"`; the interactive layer is `aria-hidden="true"`, `pointer-events: none`, and does not replace the content.
- The enhanced island starts disabled and enables only when `prefers-reduced-motion` is not requested, the pointer is fine, and the viewport is at least 768px wide. Resize and media-query listeners are cleaned up.
- `GridDistortion` is lazy-loaded only after the capability gate. It is hidden for mobile and reduced-motion CSS paths; the static hero remains usable in all cases.
- Both the static image and the lazy distortion source use the existing `withBase` helper, and a base-path build verified `/embodied-frontier/` URLs.

## Verification evidence

- TDD RED: `node --test tests/visual-license.test.mjs tests/hero-fallback.test.mjs` initially failed because the notices file and `data-static-hero` marker did not yet exist.
- TDD GREEN: the same focused command passed: 2/2 tests.
- `ASTRO_TELEMETRY_DISABLED=1 npm run build`: passed; 14 pages built.
- `ASTRO_TELEMETRY_DISABLED=1 npm test`: passed; 44/44 tests.
- `ASTRO_TELEMETRY_DISABLED=1 npm run lint`: passed with exit code 0.
- `ASTRO_TELEMETRY_DISABLED=1 npm run content:validate`: passed with 0 errors and 0 warnings; content counts were 5 papers, 3 roadmap stages, 3 projects, 3 models, 3 datasets, 5 indexed papers, 11 graph nodes, and 16 graph edges.
- `ASTRO_TELEMETRY_DISABLED=1 BASE_PATH=/embodied-frontier/ npm run build && BASE_PATH=/embodied-frontier/ node --test tests/hero-fallback.test.mjs tests/astro-shell.test.mjs`: passed; 4/4 tests.
- Built HTML inspection confirmed the static hero marker, readable heading/link, `data-enhanced="false"`, and base-prefixed hero image URL.
- Bundle inspection measured the HeroExperience chunk at approximately 32,254 gzip bytes and the lazy GridDistortion chunk at approximately 119,491 gzip bytes. The lazy chunk contains Three.js/WebGL; the HeroExperience chunk does not. The total gzip of all built non-lazy JS chunks was approximately 95,387 bytes.
- `public/hero-static.webp` was inspected as a 1536x1024 WebP and its SHA-256 was recomputed against the notice.
- Staged diff whitespace check passed with `git diff --cached --check` before the implementation commit.

## Verification limits

Browser runtime preview/QA was not completed in this sandbox: Astro preview could not access its telemetry preferences without `ASTRO_TELEMETRY_DISABLED=1`, and the sandbox prevented both the preview process and a local static server from binding/listening. Static HTML, asset, base-path, bundle, lint, build, content, and automated test evidence is available; interactive browser behavior remains for a normal local/CI environment with a listening preview server.
