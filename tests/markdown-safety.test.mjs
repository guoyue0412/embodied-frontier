import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { compileContent } from "../scripts/content-core.mjs";

const fixturePaper = `---
title: "Safety Fixture"
slug: "safety-fixture"
date: "2026-08-18"
updated: "2026-08-18"
track: "VLA"
venue: "Test"
status: "verified"
tags: [security]
summary: "A sanitizer regression fixture."
sources:
  - label: "Paper"
    url: "https://example.com/paper"
---

## Safe heading

[Safe source](https://example.com/source)

<script>alert("xss")</script>
<a href="https://example.com/raw" onclick="alert('xss')">Raw link</a>

# Extra h1
`;

test("the compiled paper body keeps safe headings and links while stripping unsafe markup", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ef-markdown-safety-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "papers"));
  await writeFile(path.join(root, "papers", "safety-fixture.md"), fixturePaper);

  const result = await compileContent({ contentDir: root, outputFile: path.join(root, "output.json") });
  const html = result.papers[0].html;
  assert.match(html, /<h2 id="safe-heading">Safe heading<\/h2>/);
  assert.match(html, /<a href="https:\/\/example\.com\/source" target="_blank" rel="noreferrer noopener">Safe source<\/a>/);
  assert.doesNotMatch(html, /<script\b|on[a-z]+\s*=/i);
  assert.doesNotMatch(html, /<h1\b/i);
});

test("paper routes render the shared sanitized body instead of Astro raw Markdown", async () => {
  const source = await readFile("src/pages/papers/[slug].astro", "utf8");
  assert.match(source, /renderSafeMarkdownDocument/);
  assert.match(source, /set:html/);
  assert.doesNotMatch(source, /render\(paper\)/);
});
