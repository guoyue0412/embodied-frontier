import test from "node:test";
import assert from "node:assert/strict";
import { checkBundleBudget, enforceBundleBudget } from "../scripts/check-bundle-budget.mjs";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("initial interactive assets stay under 120 KB gzip", async () => {
  const report = await checkBundleBudget("dist");
  assert.ok(report.initialInteractiveGzip <= 120 * 1024, JSON.stringify(report));
  assert.equal(report.sharedIncludesThree, false);
  assert.equal(report.sharedIncludesCytoscape, false);
});

test("bundle checker fails closed when the Astro client manifest is missing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "embodied-frontier-bundle-missing-"));
  try {
    await writeFile(path.join(root, "index.html"), '<!doctype html><html lang="en"><head></head><body><main><h1>Fixture</h1><script type="module" src="/_astro/entry.js"></script></main></body></html>');
    await mkdir(path.join(root, "_astro"));
    await writeFile(path.join(root, "_astro", "entry.js"), "export const entry = true;");
    await assert.rejects(() => checkBundleBudget(root, { basePath: "/" }), /manifest is missing/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("modulepreload assets count toward the budget and oversized preload fails", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "embodied-frontier-bundle-preload-"));
  try {
    await mkdir(path.join(root, "_astro"));
    await writeFile(path.join(root, "index.html"), '<!doctype html><html lang="en"><head><link rel="modulepreload" href="/_astro/preload.js"></head><body><main><h1>Fixture</h1><script type="module" src="/_astro/entry.js"></script></main></body></html>');
    await writeFile(path.join(root, "_astro", "entry.js"), "import './preload.js';");
    await writeFile(path.join(root, "_astro", "preload.js"), `export const payload = '${"x".repeat(4096)}';`);
    await writeFile(path.join(root, "astro-manifest.json"), JSON.stringify({ entry: { file: "_astro/entry.js", imports: ["_astro/preload.js"], dynamicImports: [], isEntry: true }, preload: { file: "_astro/preload.js", imports: [], dynamicImports: [], isEntry: false } }));
    const report = await checkBundleBudget(root, { basePath: "/" });
    assert.ok(report.assets.find((asset) => asset.path === "_astro/preload.js")?.initial, JSON.stringify(report));
    assert.throws(() => enforceBundleBudget(report, 100), /exceeds/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
