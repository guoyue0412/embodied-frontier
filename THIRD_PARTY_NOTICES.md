# Third-party notices

This file records the provenance and license boundary for code and assets that
are shipped in the research station. Vendored source remains in its stated
local path and is not a replacement for the upstream license text.

## React Bits visual components

- Upstream: [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits)
- Pinned upstream revision: [`4e0e030193b563be6be33d928f77d0d01cefe237`](https://github.com/DavidHDev/react-bits/commit/4e0e030193b563be6be33d928f77d0d01cefe237)
- Registry metadata: [React Bits registry](https://reactbits.dev/r/{name}.json)
- Copyright: David Haz and React Bits contributors
- License: MIT + Commons Clause, as published by the upstream repository at the pinned revision. This site uses the components for the site's own interface and does not sell or repackage React Bits as a component library.
- Imported registry variants: the official React/TypeScript CSS variants only; Vue ports and reference-site source/assets are not used.

| Component | Registry item | Local files |
| --- | --- | --- |
| Shuffle | `@react-bits/Shuffle-TS-CSS` | `src/components/vendor/react-bits/Shuffle/Shuffle.tsx`, `src/components/vendor/react-bits/Shuffle/Shuffle.css` |
| DotGrid | `@react-bits/DotGrid-TS-CSS` | `src/components/vendor/react-bits/DotGrid/DotGrid.tsx`, `src/components/vendor/react-bits/DotGrid/DotGrid.css` |
| GridDistortion | `@react-bits/GridDistortion-TS-CSS` | `src/components/vendor/react-bits/GridDistortion/GridDistortion.tsx`, `src/components/vendor/react-bits/GridDistortion/GridDistortion.css` |

## Runtime dependencies used by the vendored components

- `gsap@3.15.0` — [GreenSock/GSAP](https://github.com/greensock/GSAP), used by Shuffle and DotGrid. Copyright GreenSock, Inc.; standard no-charge license terms are published at [gsap.com/standard-license](https://gsap.com/standard-license). The dependency is used as declared by the React Bits registry; no Club plugins are included.
- `@gsap/react@2.1.2` — [greensock/react](https://github.com/greensock/react), used by Shuffle. Copyright GreenSock, Inc.; license terms are published at [gsap.com/standard-license](https://gsap.com/standard-license).
- `three@0.180.0` — [mrdoob/three.js](https://github.com/mrdoob/three.js), used only by the lazy GridDistortion chunk. Copyright three.js authors; MIT license. It is not part of the shared initial page entry.
- `@types/three@0.180.0` — [DefinitelyTyped/DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/three), development-only type declarations for the lazy Three.js consumer. Copyright the DefinitelyTyped contributors; MIT license. It is not shipped to browsers.

## First-party assets

- `public/hero-static.webp` — original abstract procedural gradient and orbital-line composition authored for this project with the built-in image generation tool on 2026-08-18, then encoded as WebP for the static hero fallback. No reference-site image, robot model, logo, or copied visual asset was used. SHA-256: `09df95ec29889453ce74223fb232ee930b7b6b040f045be507ee8497edd229f7`.
