import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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

    await writeFile(path.join(second, "desktop-home.png"), Buffer.from("different screenshot"));
    await assert.rejects(() => compareBrowserArtifacts(first, second), /artifact mismatch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
