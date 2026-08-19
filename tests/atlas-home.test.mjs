import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("homepage exposes the complete atlas command deck", async () => {
  const html = await readFile("dist/index.html", "utf8");
  for (const id of ["atlas", "navigator", "vla", "wam", "data-eval", "method"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /SYSTEM ONLINE/);
  assert.match(html, /GIT-TRACKED/);
  assert.match(html, /data-atlas-metric=/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);

  const dataLane = html.match(/<section id="data-eval"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(dataLane, /RBench/);
  assert.doesNotMatch(dataLane, /WAM 闭环评测|VLA 前沿雷达/);
});

test("atlas chapter strip and browser QA use the atlas contract", async () => {
  const styles = await readFile("src/styles/hero.css", "utf8");
  const browserQa = await readFile("scripts/browser-qa.mjs", "utf8");
  assert.match(styles, /\.atlas-chapter-strip\s*\{[^}]*?min-height:\s*(?:4[4-9]|[5-9]\d|[1-9]\d{2})px;/);
  assert.match(styles, /\.method-panel__head a\s*\{[^}]*?min-height:\s*(?:4[4-9]|[5-9]\d|[1-9]\d{2})px;/);
  assert.match(browserQa, /\.atlas-hero__copy h1/);
  assert.match(browserQa, /\.atlas-hero__static-art/);
  assert.doesNotMatch(browserQa, /["']\.hero__copy(?:\s|["'])|["']\.hero__static-art(?:["'])/);
});
