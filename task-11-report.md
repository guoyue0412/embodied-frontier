# Task 11 local delivery report

Date: 2026-08-19

## Completed locally

- Hardened `.github/workflows/verify.yml` with Node 22, npm cache, `npm ci`, `npm run verify`, read-only `contents` permission, and success-only nonproduction uploads for `dist/` and `artifacts/browser-qa/`.
- Added `.github/workflows/deploy-pages.yml` for `main` and manual dispatch, with the official GitHub Pages configure/upload/deploy actions and the `github-pages` environment; both jobs explicitly guard `github.ref == 'refs/heads/main'` so manual dispatch cannot publish another ref.
- Added `.github/pull_request_template.md` with content-source, evidence-status, third-party-license, desktop/mobile screenshot, reduced-motion, verification, and deployment-impact checkboxes.
- Added `scripts/write-codeowners.mjs`, which accepts only an explicit `@github-owner`, rejects missing or guessed owners, and writes all required ownership patterns when invoked in a target checkout.
- Updated `README.md` with clone/install/dev instructions, `src/content` ownership, branch and PR flow, Pages setup, required `verify` status, manual-review policy, and the distinction between local build output and deployment evidence.
- Added `tests/github-workflow.test.mjs` covering workflow policy, PR evidence fields, and strict CODEOWNERS generation in isolated temporary directories.

## Local validation evidence

| Check | Result |
| --- | --- |
| `node --test tests/github-workflow.test.mjs` | PASS, 7/7 |
| `npm run verify` | PASS, 83/83 tests inside the production gate |
| Production build | PASS, 14 static pages |
| Content build | PASS, 5 papers, 3 roadmap stages, 3 projects, 3 models, 3 datasets |
| Full test suite inside `verify` | PASS, 83/83 |
| ESLint | PASS |
| Static-site checker | PASS, 14 files, zero errors |
| Bundle budget | PASS, initial interactive gzip 100459 bytes / 122880-byte budget; shared bundles exclude Three.js and Cytoscape |
| Browser QA | PASS, desktop, mobile-touch, desktop-reduced-motion, and no-JavaScript checks; `failures: []`, `consoleErrors: []`, resource and HTTP errors empty |
| Browser QA repeatability | PASS, report SHA-256 `71c390e72b2744857d4b9b4b94310ba9a36df2230e3e6f84ddc45e2b25a0bbc3`; 5 screenshots identical |
| `git diff --check` | PASS |

The first unprivileged `npm run verify` attempt reached all deterministic checks but could not bind the local browser-QA server (`listen EPERM` on `127.0.0.1`). The same command was then rerun with the required local-listening permission and passed completely; this is an environment boundary, not a repository failure.

## External blocker — not bypassed

The repository has no configured Git remote (`git remote -v` returned no entries). `gh repo view --json owner -q .owner.login` reports `no git remotes found`, and `gh auth status` reports that the active `guoyue0412` token is invalid. Therefore the real repository owner cannot be resolved.

`.github/CODEOWNERS` is intentionally absent. No guessed owner was written, no external repository was created, and nothing was pushed. The strict generator and its isolated temporary-directory tests are complete, but generating the repository CODEOWNERS file and completing the GitHub push remain blocked until the user supplies the repository URL and restores valid GitHub authentication.

Once that boundary is available, run from this checkout:

```bash
git remote add origin <github-repository-url>
gh auth login -h github.com
repo_owner=$(gh repo view --json owner -q .owner.login)
node scripts/write-codeowners.mjs "@$repo_owner"
git add .github/CODEOWNERS
git commit -m "ci: add pull-request and github pages delivery"
git push -u origin feat/github-visual-system
```
