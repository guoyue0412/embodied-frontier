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

test("comparison pages disclose provenance and explicit missing reasons for every visible field", async () => {
  const html = await readFile("dist/models/index.html", "utf8");
  assert.match(html, /字段来源与缺口/);
  assert.match(html, /字段级来源/);
  assert.match(html, /记录级来源/);
  assert.match(html, /未逐字段核验/);
  assert.match(html, /data-provenance-level="field"/);
  assert.match(html, /data-provenance-level="record"/);
  assert.match(html, /data-missing-reason/);
  assert.match(html, /未披露可核验|字段级来源未声明/);
  assert.match(html, /<details[^>]*class="field-provenance"/);
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
  const { canRankFields, compareMetric } = await import("../src/lib/comparison-core.mjs");
  assert.equal(canRankFields([
    { protocol: "suite-a", value: 80, unit: "percent" },
    { protocol: "suite-b", value: 90, unit: "percent" },
  ]), false);
  assert.equal(canRankFields([
    { protocol: "suite-a", value: 80, unit: "percent" },
    { protocol: "suite-a", value: 90, unit: "steps" },
  ]), false);
  assert.equal(canRankFields([
    { field: "success_rate", protocol: "suite-a", value: 80, unit: "percent" },
    { field: "success_rate", protocol: "suite-a", value: 90, unit: "percent" },
  ]), true);
  assert.equal(canRankFields([
    { field: "success_rate", protocol: "suite-a", value: 80, unit: "percent" },
    { field: "success_rate", protocol: "suite-a", value: 70, unit: "percent" },
    { field: "success_rate", protocol: "suite-b", value: null, unit: "percent" },
  ]), false);
  assert.equal(canRankFields([
    { field: "success_rate", protocol: "suite-a", value: 80, unit: "percent" },
    { field: "success_rate", protocol: "suite-a", value: 70, unit: "" },
  ]), false);
  assert.equal(canRankFields([
    { field: "success_rate", protocol: "suite-a", value: 80, unit: "percent" },
    { field: "success_rate", protocol: "", value: 70, unit: "percent" },
  ]), false);
  assert.equal(canRankFields([
    { field: "success_rate", protocol: "suite-a", value: 80, unit: "percent" },
    { field: "other_metric", protocol: "suite-a", value: 70, unit: "percent" },
  ]), false);
  assert.equal(canRankFields([
    { protocol: "suite-a", value: 80, unit: "percent" },
    { protocol: "suite-a", value: 70, unit: "percent" },
  ]), false);
  const fullSet = compareMetric([
    { title: "A", protocol: "suite-a", facts: { success_rate: { value: 80, unit: "percent" } } },
    { title: "B", protocol: "suite-a", facts: { success_rate: { value: 70, unit: "percent" } } },
    { title: "C", protocol: "suite-b", facts: { success_rate: { value: null, unit: "percent" } } },
  ], "success_rate");
  assert.equal(fullSet.comparable, false);
  assert.deepEqual(fullSet.ranking, []);
  assert.match(fullSet.warning, /协议不同/);
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

test("browser QA normalizes trailing-slash routes and reports missing search controls", async () => {
  const browserQa = await readFile("scripts/browser-qa.mjs", "utf8");
  assert.match(browserQa, /trailingSlash/);
  assert.match(browserQa, /if \(!input\) throw new Error/);
  assert.match(browserQa, /search input|搜索控件/i);
});
