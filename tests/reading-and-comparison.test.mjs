import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("comparison pages explain incompatible protocols", async () => {
  const html = await readFile("dist/models/index.html", "utf8");
  assert.match(html, /协议一致性锁/);
  assert.match(html, /不可排序/);
  assert.match(html, /single-step-action-v1/);
  assert.match(html, /flow-action-chunk-v1/);
  assert.doesNotMatch(html, /data-sort-field=/);
});

test("paper pages expose progressive reading tools without hiding prose", async () => {
  const html = await readFile("dist/papers/openvla/index.html", "utf8");
  assert.match(html, /阅读进度/);
  assert.match(html, /证据透镜/);
  assert.match(html, /class="prose"/);
  assert.doesNotMatch(html, /\.prose[^{}]*display:\s*none/);
  assert.doesNotMatch(html, /\.prose[^{}]*visibility:\s*hidden/);
});

test("comparison core refuses field ranking across protocols or units", async () => {
  const { canRankFields } = await import("../src/lib/comparison-core.mjs");
  assert.equal(canRankFields([
    { protocol: "suite-a", value: 80, unit: "percent" },
    { protocol: "suite-b", value: 90, unit: "percent" },
  ]), false);
  assert.equal(canRankFields([
    { protocol: "suite-a", value: 80, unit: "percent" },
    { protocol: "suite-a", value: 90, unit: "steps" },
  ]), false);
  assert.equal(canRankFields([
    { protocol: "suite-a", value: 80, unit: "percent" },
    { protocol: "suite-a", value: 90, unit: "percent" },
  ]), true);
});

test("reading islands use cancellable passive progress updates and preserve all lens actions", async () => {
  const progress = await readFile("src/components/islands/ReadingProgress.tsx", "utf8");
  const lens = await readFile("src/components/islands/EvidenceLens.tsx", "utf8");
  assert.match(progress, /passive:\s*true/);
  assert.match(progress, /requestAnimationFrame/);
  assert.match(progress, /scaleX\(\$\{next\}\)/);
  assert.match(progress, /removeEventListener/);
  for (const label of ["全部证据", "突出已核验", "突出待核"]) assert.match(lens, new RegExp(label));
  assert.match(lens, /data-evidence-lens/);
  assert.match(lens, /localStorage/);
});
