# Task 6 Report: Integrate licensed text and background effects

Status: DONE

- Base SHA: `4ebc4b7248969c64f30ff5860d7527949ca77a3d`
- Implementation commits: `17c4046` (`feat: add licensed interactive hero effects`), `c64c560` (`fix: harden hero visual lifecycle`), `32ae087` (`fix: close hero visual listeners on setup failure`)
- Scope: licensed React Bits hero effects, original static hero artwork, static-first Astro fallback, capability/reduced-motion gates, visibility lifecycle gates, scoped interaction, WebGL/texture failure recovery, base-path-safe asset handling, provenance notices, and focused regression tests.

## Provenance and license

- React Bits sources were obtained from the official registry at `https://reactbits.dev/r/{name}.json` and vendored under `src/components/vendor/react-bits/`.
- The recorded upstream React Bits repository revision is `4e0e030193b563be6be33d928f77d0d01cefe237`: [DavidHDev/react-bits commit](https://github.com/DavidHDev/react-bits/commit/4e0e030193b563be6be33d928f77d0d01cefe237).
- The complete upstream `MIT + Commons Clause License Condition v1.0` text is vendored at `src/components/vendor/react-bits/LICENSE.md`, matching the pinned [upstream LICENSE.md](https://github.com/DavidHDev/react-bits/blob/4e0e030193b563be6be33d928f77d0d01cefe237/LICENSE.md). `THIRD_PARTY_NOTICES.md` identifies the local license path and the vendored `Shuffle`, `DotGrid`, and `GridDistortion` TS/CSS sources. `Shuffle` remains an available licensed source but is not mounted in the hero, avoiding unnecessary client JavaScript while preserving the static heading.
- Runtime dependencies and licenses are recorded for `gsap@3.15.0`, `@gsap/react@2.1.2`, and lazy-only `three@0.180.0`; `@types/three@0.180.0` is a development-only type dependency.
- `public/hero-static.webp` is first-party artwork generated for this task, with no copied reference-site asset, logo, or text. SHA-256: `09df95ec29889453ce74223fb232ee930b7b6b040f045be507ee8497edd229f7`.

## Static fallback and runtime gates

- The readable hero heading, summary, and `进入论文档案` link remain server-rendered semantic HTML under `<section data-static-hero>`.
- The static artwork is a normal `<img>` with an empty alt and `aria-hidden="true"`; the interactive layer is `aria-hidden="true"`, `pointer-events: none`, and does not replace the content.
- The enhanced island starts disabled and enables only when `prefers-reduced-motion` is not requested, the pointer is fine, and the viewport is at least 768px wide. Resize and media-query listeners are cleaned up.
- `GridDistortion` is lazy-loaded only after the capability gate. It is hidden for mobile and reduced-motion CSS paths; the static hero remains usable in all cases.
- `DotGrid` and `GridDistortion` share a tested animation lifecycle that starts only after intersection, stops on offscreen/document-hidden transitions, cancels pending RAFs, resumes on visibility, and disposes observers/listeners. DotGrid also kills active GSAP tweens when inactive.
- The visual layers keep `pointer-events: none` so semantic hero links remain clickable; vendored interactions instead bind to the nearest `[data-static-hero]` ancestor and preserve normal event bubbling/default actions. WebGL renderer construction, resize/render operations, and texture loading are guarded by a deterministic failure gate; the parent error boundary also removes optional enhancement failures without removing static content.
- Both the static image and the lazy distortion source use the existing `withBase` helper, and a base-path build verified `/embodied-frontier/` URLs.

## Verification evidence

- TDD RED: the lifecycle/license contract command initially failed because the runtime module and vendored license file did not yet exist; the original focused fallback/license command also failed before Task 6 implementation because the notices file and `data-static-hero` marker did not yet exist.
- TDD GREEN: `node --test tests/hero-visual-runtime.test.mjs tests/visual-license.test.mjs` passed: 5/5 tests, including lifecycle pause/resume/disposal, single-failure reporting, scoped event binding, full-license text, and pinned-path provenance. The fallback focused test also passes in the full suite.
- `ASTRO_TELEMETRY_DISABLED=1 npm run build`: passed; 14 pages built.
- `ASTRO_TELEMETRY_DISABLED=1 npm test`: passed; 48/48 tests.
- `ASTRO_TELEMETRY_DISABLED=1 npm run lint`: passed with exit code 0.
- `ASTRO_TELEMETRY_DISABLED=1 npm run content:validate`: passed with 0 errors and 0 warnings; content counts were 5 papers, 3 roadmap stages, 3 projects, 3 models, 3 datasets, 5 indexed papers, 11 graph nodes, and 16 graph edges.
- `ASTRO_TELEMETRY_DISABLED=1 BASE_PATH=/embodied-frontier/ npm run build && BASE_PATH=/embodied-frontier/ node --test tests/hero-fallback.test.mjs tests/astro-shell.test.mjs tests/hero-visual-runtime.test.mjs`: passed; 8/8 tests.
- Built HTML inspection confirmed the static hero marker, readable heading/link, `data-enhanced="false"`, and base-prefixed hero image URL.
- Bundle inspection measured the HeroExperience chunk at approximately 32,721 gzip bytes and the lazy GridDistortion chunk at approximately 119,905 gzip bytes. The lazy chunk contains Three.js/WebGL; the HeroExperience chunk and shared lifecycle helper do not. The total gzip of all built non-lazy JS chunks was approximately 96,356 bytes.
- `public/hero-static.webp` was inspected as a 1536x1024 WebP and its SHA-256 was recomputed against the notice.
- Staged diff whitespace check passed with `git diff --cached --check` before the implementation commit.
- Final code commit `32ae087` passed `git diff --cached --check`; the report is recorded separately after the code commit.

## Verification limits

Browser runtime preview/QA was not completed in this sandbox: Astro preview could not access its telemetry preferences without `ASTRO_TELEMETRY_DISABLED=1`, and the sandbox prevented both the preview process and a local static server from binding/listening. Static HTML, asset, base-path, bundle, lint, build, content, and automated test evidence is available; interactive browser behavior remains for a normal local/CI environment with a listening preview server.
