import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { compareBrowserArtifacts } from "../scripts/compare-browser-qa.mjs";

test("browser artifact comparison normalizes output directory metadata and hashes screenshots", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "embodied-frontier-qa-repeatability-"));
  const first = path.join(root, "first");
  const second = path.join(root, "second");
  try {
    await mkdir(first, { recursive: true });
    await mkdir(second, { recursive: true });
    const report = { schemaVersion: 2, artifactsDirectory: "first", assertions: [{ passed: true, name: "ready" }] };
    await writeFile(path.join(first, "report.json"), JSON.stringify(report));
    await writeFile(path.join(second, "report.json"), JSON.stringify({ ...report, artifactsDirectory: "/tmp/second" }));
    await writeFile(path.join(first, "desktop-home.png"), Buffer.from("same screenshot"));
    await writeFile(path.join(second, "desktop-home.png"), Buffer.from("same screenshot"));

    const result = await compareBrowserArtifacts(first, second);
    assert.equal(result.status, "ok");
    assert.equal(result.screenshots["desktop-home.png"].equal, true);

    await writeFile(path.join(second, "report.json"), JSON.stringify({
      ...report,
      artifactsDirectory: "/tmp/second",
      assertions: [{ passed: true, name: "ready", details: { route: "/changed" } }],
    }));
    await assert.rejects(() => compareBrowserArtifacts(first, second), /normalized report/);
    await writeFile(path.join(second, "report.json"), JSON.stringify({ ...report, artifactsDirectory: "/tmp/second" }));

    await writeFile(path.join(second, "extra.png"), Buffer.from("unexpected screenshot"));
    await assert.rejects(() => compareBrowserArtifacts(first, second), /screenshot extra\.png/);
    await rm(path.join(second, "extra.png"), { force: true });
    await rm(path.join(second, "desktop-home.png"), { force: true });
    await assert.rejects(() => compareBrowserArtifacts(first, second), /screenshot desktop-home\.png/);
    await writeFile(path.join(second, "desktop-home.png"), Buffer.from("same screenshot"));

    await writeFile(path.join(second, "desktop-home.png"), Buffer.from("different screenshot"));
    await assert.rejects(() => compareBrowserArtifacts(first, second), /screenshot desktop-home\.png/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("browser QA disables smooth scrolling before measuring pointer targets", async () => {
  const source = await readFile("scripts/browser-qa.mjs", "utf8");
  const selectorCenter = source.match(/async function selectorCenter\(selector\) \{[\s\S]*?\n\s{2}\}/)?.[0] ?? "";
  assert.match(selectorCenter, /scrollIntoView\(\{[^}]*behavior:\s*["']instant["']/);
});
