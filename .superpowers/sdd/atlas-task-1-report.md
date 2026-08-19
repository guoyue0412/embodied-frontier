# Task 1 Report: Build the static atlas shell and research lanes

Status: DONE

- Base SHA: `c20c61de59a41a6a97bbcbdff579c02ac6bf56bc`
- Implementation commit: `1a3887a` (`feat: rebuild homepage as embodied atlas`)
- Review follow-up commit: `b0e473f` (`fix: harden atlas landing review contracts`)
- Scope: static Atlas command deck, chapter rail, repository metrics, complete no-JavaScript destination grid, VLA/WAM/Data-Eval research lanes, and consolidated Method/evidence chapter.
- No Task 2 navigator island, new dependency, progress-ledger edit, push, or deployment was performed.

## Repository-backed output

- The homepage reads all five typed collections at build time: 5 papers, 3 models, 3 datasets, 3 projects, and 3 roadmap stages.
- The six chapter anchors are `atlas`, `navigator`, `vla`, `wam`, `data-eval`, and `method`.
- The static navigator exposes Papers, Models, Datasets, Graph, Roadmap, and Projects through normal `withBase()` links.
- VLA records are derived from VLA papers/models; WAM records are derived from the WAM project and matching repository records; Data/Eval records are derived from Data & Eval papers, datasets, and the RBench project.
- WAM explicitly states the current coverage gap rather than inventing prediction or closed-loop results.
- The first viewport keeps one semantic `main` and one `h1`, system status, bilingual identity, three primary routes, repository metrics, static artwork, and the indexed chapter strip.
- Mobile/touch styles switch the rail to horizontal scrolling and remove the visual enhancement; reduced-motion styles preserve all content while removing depth transforms. The existing HeroExperience remains capability-gated and independently static-first.

## TDD and verification evidence

- TDD RED: `npm run build && node --test tests/atlas-home.test.mjs` failed before implementation because `atlas`, `navigator`, and the remaining chapter anchors were absent.
- TDD GREEN: the same command passed after implementation.
- Focused Task 1 regression: `npm run build && node --test tests/atlas-home.test.mjs tests/rendered-html.test.mjs tests/astro-shell.test.mjs tests/design-system.test.mjs` passed, 14/14.
- Full suite: `npm test` passed, 101/101 tests; Astro build produced 14 static pages.
- ESLint: `npm run lint` passed with exit code 0.
- Static checker: `node scripts/check-static-site.mjs dist` passed with 14 files and 0 errors.
- GitHub Pages base-path: `BASE_PATH=/embodied-frontier npm run build`, the 14 focused tests, and `BASE_PATH=/embodied-frontier node scripts/check-static-site.mjs dist` passed with 0 static-site errors.
- `git diff --cached --check` passed before the implementation commit.

## Review follow-up

- Atlas chapter links and the method header link now keep a 44px minimum target; the chapter strip is measured at 62px on desktop 1440px, mobile 360px, and reduced-motion desktop browser profiles.
- Browser QA readiness and fallback selectors now target `.atlas-hero__copy` and `.atlas-hero__static-art`, so route, static fallback, and reduced-motion checks exercise the rendered Atlas contract. The Atlas rail keeps visual current styling without claiming `aria-current="page"` before section tracking exists.
- The 360px unit label and coordinates are separated into distinct corners. The status line explicitly includes `GIT-TRACKED`, and the Data/Eval lane now admits only the repository-backed `rbench-evaluation` project alongside its Data/Eval papers and datasets; WAM/VLA projects are excluded.
- Review TDD RED: after adding the 44px method-link regression, the focused test failed against the 42px declaration. Review TDD GREEN: restoring 44px passed the focused test.
- Browser QA: `SITE_URL=http://127.0.0.1:58305/ BROWSER_QA_PORT=0 BROWSER_QA_ARTIFACTS=/tmp/atlas-task1-browser-qa-final npm run qa:browser` passed with `failures: []`, 33 route checks, and 256 assertions across desktop 1440px, mobile touch 360px, reduced-motion desktop, and no-JavaScript profiles. The homepage fallback/readiness, 44px chapter-strip measurements, Git-tracked status, and no-JavaScript checks all passed.

## Verification limit

`npm run content:validate` still reports one pre-existing unrelated diagnostic in `src/components/islands/HeroExperience.tsx:35` (`evaluateHeroCapabilities` returns an inferred `string` status). The Task 1 homepage diagnostics are clean; that existing file was not changed within this task scope.
