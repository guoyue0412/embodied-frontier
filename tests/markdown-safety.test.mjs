import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { compileContent } from "../scripts/content-core.mjs";
import { renderSafeMarkdownDocument } from "../src/lib/safe-markdown.mjs";

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
  assert.match(source, /recordSources:\s*paper\.data\.sources/);
  assert.match(source, /set:html/);
  assert.doesNotMatch(source, /render\(paper\)/);
});

test("paper reader renders safe figures with title, source, alt, and progressive lightbox hooks", async () => {
  const fixture = await readFile("tests/fixtures/paper-reader-media.md", "utf8");
  const result = renderSafeMarkdownDocument(fixture);
  assert.equal(result.hasMedia, true);
  assert.match(result.html, /<figure class="prose-figure">/);
  assert.match(result.html, /<img[^>]+src="https:\/\/example\.com\/figure\.png"/);
  assert.match(result.html, /alt="Robot trajectories"/);
  assert.match(result.html, /title="Figure 1 — schematic"/);
  assert.match(result.html, /data-lightbox-src="https:\/\/example\.com\/figure\.png"/);
  assert.match(result.html, /aria-label="打开图片：Robot trajectories"/);
  assert.match(result.html, /<figcaption>.*Figure 1 — schematic.*来源/s);
  assert.doesNotMatch(result.html, /<script\b|on[a-z]+\s*=/i);
});

test("paper reader keeps Mermaid and formula fallbacks visible without runtime libraries", () => {
  const result = renderSafeMarkdownDocument([
    "```mermaid",
    "graph TD",
    "  A[Observe] --> B[Act]",
    "```",
    "",
    "```math",
    "\\hat{a}_t = \\pi(o_t, l)",
    "```",
    "\nInline formula: $a_t = \\pi(o_t)$.\n",
  ].join("\n"));
  assert.equal(result.hasMermaid, true);
  assert.equal(result.hasFormula, true);
  assert.match(result.html, /class="mermaid-diagram"/);
  assert.match(result.html, /role="img"/);
  assert.match(result.html, /Observe/);
  assert.match(result.html, /class="formula-block"/);
  assert.match(result.html, /role="math"/);
  assert.match(result.html, /hat\{a\}_t/);
  assert.match(result.html, /class="formula-inline"/);
});

test("paper reader recognizes standard inline LaTeX and preserves escaped text/code", () => {
  const result = renderSafeMarkdownDocument([
    "Escaped \\$not-formula\\$ and \\\\(not-formula\\\\).",
    "Inline \\(\\pi(o_t)\\) and $a_t$ remain accessible.",
    "",
    "    \\(\\text{code}\\) $code$",
  ].join("\n"), {
    recordSources: [{ label: "Paper", url: "https://example.com/paper" }],
  });
  assert.equal((result.html.match(/class="formula-inline"/g) ?? []).length, 2);
  assert.match(result.html, /class="formula-inline" role="math" aria-label="行内公式：pi\(o_t\)"/);
  assert.match(result.html, /class="formula-inline" role="math" aria-label="行内公式：a_t"/);
  assert.match(result.html, /Escaped \$not-formula\$/);
  assert.match(result.html, /not-formula/);
  assert.match(result.html, /<pre><code>/);
  assert.match(result.html, /text\{code\}/);
  assert.match(result.html, /\$code\$/);
});

test("Mermaid and formula fallbacks expose title, description, and field source", () => {
  const result = renderSafeMarkdownDocument([
    "```mermaid title=\"Research flow\" description=\"A static relationship diagram\" source=\"https://example.com/diagram\"",
    "graph TD",
    "  A[Observe] --> B[Act]",
    "```",
    "",
    "```math title=\"Action mapping\" description=\"Maps observation to action\" source=\"https://example.com/formula\"",
    "a_t = \\pi(o_t)",
    "```",
  ].join("\n"), {
    recordSources: [{ label: "Paper", url: "https://example.com/paper" }],
  });
  assert.match(result.html, /Research flow/);
  assert.match(result.html, /A static relationship diagram/);
  assert.match(result.html, /href="https:\/\/example\.com\/diagram"/);
  assert.match(result.html, /Action mapping/);
  assert.match(result.html, /Maps observation to action/);
  assert.match(result.html, /href="https:\/\/example\.com\/formula"/);
  assert.match(result.html, /role="img" aria-label="A static relationship diagram"/);
  assert.match(result.html, /role="math" aria-label="Maps observation to action"/);
});

test("fallback metadata is deterministic and uses the paper record source", () => {
  const result = renderSafeMarkdownDocument([
    "```mermaid",
    "graph TD",
    "  A --> B",
    "```",
    "",
    "```math",
    "x + y",
    "```",
    "",
    "Inline \\(x\\).",
  ].join("\n"), {
    recordSources: [{ label: "Record paper", url: "https://example.com/record" }],
  });
  assert.match(result.html, /<span class="prose-fallback__title">Mermaid 图示<\/span>/);
  assert.match(result.html, /Mermaid 源码静态回退/);
  assert.match(result.html, /<span class="prose-fallback__title">公式<\/span>/);
  assert.match(result.html, /公式源码静态回退/);
  assert.match(result.html, /href="https:\/\/example\.com\/record"/);
  assert.match(result.html, /行内公式/);
});

test("unsafe metadata is escaped and falls back to the record source", () => {
  const result = renderSafeMarkdownDocument([
    "```mermaid title=\"<img>\" description=\"<script>alert(1)</script>\" source=\"javascript:alert(1)\"",
    "graph TD",
    "  A --> B",
    "```",
  ].join("\n"), {
    recordSources: [{ label: "Record paper", url: "https://example.com/record" }],
  });
  assert.doesNotMatch(result.html, /<script\b|<img\b|javascript:/i);
  assert.match(result.html, /<span class="prose-fallback__title">Mermaid 图示<\/span>/);
  assert.match(result.html, /href="https:\/\/example\.com\/record"/);
});

test("legacy browsers keep the original lightbox link when dialog APIs are absent", async () => {
  const source = await readFile("src/components/islands/MediaLightbox.tsx", "utf8");
  const supportCheck = source.indexOf('typeof dialog.showModal !== "function"');
  const preventDefault = source.indexOf("event.preventDefault()");
  assert.ok(supportCheck >= 0);
  assert.ok(preventDefault > supportCheck);
  assert.match(source.slice(supportCheck, preventDefault), /return/);
});

test("paper reader rejects unsafe image schemes while preserving the text alternative", () => {
  const result = renderSafeMarkdownDocument("![Unsafe](javascript:alert(1))");
  assert.doesNotMatch(result.html, /<img\b/i);
  assert.doesNotMatch(result.html, /javascript:/i);
  assert.match(result.html, /Unsafe/);
});
