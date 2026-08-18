import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { compileContent } from "../scripts/content-core.mjs";

const validPaper = `---
title: "Test Paper"
slug: "test-paper"
date: "2026-08-18"
updated: "2026-08-18"
track: "VLA"
venue: "Test"
status: "verified"
tags: [test]
summary: "A valid test paper."
sources:
  - label: "Paper"
    url: "https://example.com/paper"
---

## Note

Valid content.
`;

const validRoadmap = `---
title: "Stage"
slug: "stage"
order: 1
label: "STAGE"
duration: "1 week"
summary: "A stage."
goals: ["Learn"]
outputs: ["Report"]
reading: ["test-paper"]
---

Stage body.
`;

const validProject = `---
title: "Project"
slug: "project"
updated: "2026-08-18"
status: "active"
question: "Does it work?"
summary: "A project."
evidence: ["A passing test"]
next: "Run another test."
---

Project body.
`;

async function fixture(t, paper = validPaper) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ef-content-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const section of ["papers", "roadmap", "projects"]) await mkdir(path.join(root, section));
  await Promise.all([
    writeFile(path.join(root, "papers", "paper.md"), paper),
    writeFile(path.join(root, "roadmap", "stage.md"), validRoadmap),
    writeFile(path.join(root, "projects", "project.md"), validProject),
  ]);
  return root;
}

async function compileFixture(t, paper = validPaper) {
  const contentDir = await fixture(t, paper);
  return compileContent({ contentDir, outputFile: path.join(contentDir, "output.json") });
}

test("compiles valid Markdown collections", async (t) => {
  const result = await compileFixture(t);
  assert.equal(result.papers.length, 1);
  assert.equal(result.roadmap.length, 1);
  assert.equal(result.projects.length, 1);
});

test("rejects an invalid evidence status", async (t) => {
  await assert.rejects(() => compileFixture(t, validPaper.replace('status: "verified"', 'status: "certain"')), /status must be one of/);
});

test("rejects an invalid date", async (t) => {
  await assert.rejects(() => compileFixture(t, validPaper.replace('date: "2026-08-18"', 'date: "18-08-2026"')), /date must be YYYY-MM-DD/);
});

test("rejects a non-http source", async (t) => {
  await assert.rejects(() => compileFixture(t, validPaper.replace("https://example.com/paper", "file:///tmp/paper")), /must use http or https/);
});

test("rejects duplicate slugs", async (t) => {
  const contentDir = await fixture(t);
  await writeFile(path.join(contentDir, "papers", "duplicate.md"), validPaper.replace("Test Paper", "Duplicate Paper"));
  await assert.rejects(() => compileContent({ contentDir, outputFile: path.join(contentDir, "out.json") }), /duplicate slug test-paper/);
});

test("removes unsafe HTML from Markdown", async (t) => {
  const result = await compileFixture(t, `${validPaper}\n<script>alert(1)</script>\n`);
  assert.doesNotMatch(result.papers[0].html, /<script|alert\(1\)/);
});
