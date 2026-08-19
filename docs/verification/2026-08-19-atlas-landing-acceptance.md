# Atlas landing experience acceptance — 2026-08-19

## Scope

This acceptance covers Tasks 2–4 of the approved atlas landing plan: the progressive orbital navigator, the anonymized Demo Lab and native video contract, and deterministic browser QA for root and GitHub Pages base paths.

## Source and privacy audit

The public profile taxonomy was derived from the user-provided resume PDF and 21-slide self-introduction deck. Only broad, defensible capability areas were retained: VLA, world-action modelling, data and evaluation, simulation and deployment, and research tooling.

The following material remains unpublished: phone and email, portrait and personal photos, employer/client identities, internal interfaces and repository paths, workplace or robot imagery, private datasets/checkpoints, and unapproved numerical outcome claims. Demo records remain empty until a specific case and its media pass anonymization, licensing, and evidence review.

## Build and test evidence

| Gate | Root | GitHub Pages `/embodied-frontier` |
| --- | --- | --- |
| Unit and contract tests | 119/119 pass | 119/119 pass |
| Static pages | 15, zero errors | 15, zero errors |
| Initial interactive gzip | 102,552 bytes | 102,590 bytes |
| Browser QA failures | 0 | 0 |
| Screenshot repeatability | 7/7 identical | 7/7 identical |

Both runs include production build, lint, static HTML checks, bundle budget, base-path checks, browser interaction checks, no-JavaScript fallbacks, and reduced-motion checks.

## Visual inspection

- Desktop 1440×900: command-deck hierarchy, system state, repository metrics, primary actions, Atlas navigation, and embodied fallback are visible and coherent.
- Mobile 360×800: navigation wraps without horizontal overflow; headings fit their content boxes; touch controls remain at least 44px.
- Reduced motion: the Atlas navigator remains frozen in a deterministic static layout.
- Demo Lab: desktop and mobile views present an intentional portfolio surface with an explicit reviewed-content gap and no organization identity.

Evidence artifacts live under `artifacts/browser-qa/`, including desktop/mobile home, desktop/mobile Demo Lab, graph, reduced-motion captures, and the machine-readable report.

## Deployment boundary

Local build and browser evidence are complete. GitHub Pages deployment is not claimed until PR #1 is manually reviewed, merged to `main`, and the Pages workflow succeeds on the public repository.
