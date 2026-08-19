import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compileContent } from "../scripts/content-core.mjs";
import { validateRelations } from "../scripts/validate-relations.mjs";

const collectionNames = ["papers", "models", "datasets", "projects", "roadmap"];

test("all research Markdown lives under src/content", async () => {
  await access("src/content/papers/openvla.md");
  await Promise.all(collectionNames.map((name) => access(`src/content/${name}`)));
  await Promise.all(collectionNames.map((name) => assert.rejects(access(`content/${name}`))));
});

test("relation validation rejects dangling targets", () => {
  assert.throws(
    () => validateRelations([{ id: "paper:a", relations: [{ target: "model:missing", type: "describes" }] }]),
    /paper:a.*model:missing/,
  );
});

test("Astro schemas retain the evidence enum", async () => {
  const source = await readFile("src/content.config.ts", "utf8");
  assert.match(source, /z\.enum\(\["verified", "self-reported", "unverified"\]\)/);
  assert.match(source, /new URL\(value\)\.protocol/);
  assert.match(source, /\^\[a-z0-9\]\+\(\?:-\[a-z0-9\]\+\)\*\$/);
  assert.match(source, /function isRealCalendarDate/);
});

test("content validation is self-contained and graph builds use relation validation", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.match(packageJson.scripts["content:validate"], /^ASTRO_TELEMETRY_DISABLED=1 astro check/);

  const graphBuild = await readFile("scripts/build-graph.mjs", "utf8");
  assert.match(graphBuild, /validateRelations/);
  assert.match(graphBuild, /id: `\$\{record\.type\}:\$\{record\.slug\}`/);
});

const validPaper = `---
title: "Validation Paper"
slug: "valid-paper"
date: "2026-08-18"
updated: "2026-08-18"
track: "VLA"
venue: "Test"
status: "verified"
tags: [test]
summary: "A valid paper."
sources:
  - label: "Paper"
    url: "https://example.com/paper"
---

Body.
`;

async function compileFixture(t, paper) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ef-astro-content-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "papers"));
  await writeFile(path.join(root, "papers", "paper.md"), paper);
  return compileContent({ contentDir: root, outputFile: path.join(root, "output.json") });
}

test("legacy validation rejects non-http URLs, malformed slugs, and impossible dates", async (t) => {
  await assert.rejects(
    () => compileFixture(t, validPaper.replace("https://example.com/paper", "file:///tmp/paper")),
    /must use http or https/,
  );
  await assert.rejects(
    () => compileFixture(t, validPaper.replace('slug: "valid-paper"', 'slug: "valid--paper"')),
    /slug must use lowercase words separated by hyphens/,
  );
  await assert.rejects(
    () => compileFixture(t, validPaper.replace('date: "2026-08-18"', 'date: "2026-02-30"')),
    /date must be YYYY-MM-DD/,
  );
});
