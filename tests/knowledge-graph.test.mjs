import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildKnowledgeGraph } from "../src/lib/graph-core.mjs";

const content = {
  papers: [{ type: "paper", slug: "paper-a", title: "Paper A", track: "VLA", relations: [{ target: "model:model-a", type: "describes" }] }],
  models: [{ type: "model", slug: "model-a", title: "Model A", family: "VLA", relations: [{ target: "dataset:data-a", type: "trained-on" }] }],
  datasets: [{ type: "dataset", slug: "data-a", title: "Data A", organization: "Lab", relations: [] }],
};

test("builds deterministic nodes and edges from explicit relations", () => {
  const first = buildKnowledgeGraph(content);
  const second = buildKnowledgeGraph({ ...content, papers: [...content.papers].reverse() });
  assert.deepEqual(first, second);
  assert.deepEqual(first.nodes.map((node) => node.id), ["dataset:data-a", "model:model-a", "paper:paper-a"]);
  assert.deepEqual(first.edges.map((edge) => `${edge.source}->${edge.target}`), ["model:model-a->dataset:data-a", "paper:paper-a->model:model-a"]);
});

test("rejects dangling relation targets with the source id", () => {
  const broken = structuredClone(content);
  broken.models[0].relations[0].target = "dataset:missing";
  assert.throws(() => buildKnowledgeGraph(broken), /model:model-a.*dataset:missing/);
});

test("graph HTML keeps the complete list and defers Cytoscape", async () => {
  const html = await readFile("dist/graph/index.html", "utf8");
  assert.match(html, /完整关系清单/);
  assert.match(html, /加载交互图谱/);
  assert.doesNotMatch(html, /cytoscape[^<]*\.js/i);
});

test("graph island serializes the configured base for client navigation", async () => {
  const html = await readFile("dist/graph/index.html", "utf8");
  const configuredBase = process.env.BASE_PATH && process.env.BASE_PATH !== "/"
    ? `/${process.env.BASE_PATH.replace(/^\/+|\/+$/g, "")}/`
    : "/";
  assert.match(html, /basePath/);
  assert.match(html, new RegExp(escapeRegExp(configuredBase)));
});

test("graph client QA targets the current map controls and path contract", async () => {
  const browserQa = await readFile("scripts/browser-qa.mjs", "utf8");
  const mapSource = await readFile("src/components/islands/KnowledgeMap.tsx", "utf8");
  for (const selector of [".knowledge-graph__load", ".knowledge-map__nodes button", ".knowledge-map__path a", "data-knowledge-map-ready"])
    assert.match(browserQa, new RegExp(escapeRegExp(selector)));
  assert.match(browserQa, /nodeCount\s*>\s*0/);
  assert.match(browserQa, /pathCount\s*>\s*0/);
  assert.match(browserQa, /graphMobile/);
  assert.match(browserQa, /allTouchSized/);
  assert.match(mapSource, /研究方向分组/);
  assert.doesNotMatch(mapSource, /研究方向聚类/);
  assert.match(mapSource, /layout:\s*\{\s*name:\s*["']preset["']/);
  assert.match(mapSource, /positions:/);
});

test("graph state replays delayed changes and ignores updates after disposal", async () => {
  const { createKnowledgeGraphStateSynchronizer } = await import("../src/lib/knowledge-graph-runtime.mjs");
  const applied = [];
  const synchronizer = createKnowledgeGraphStateSynchronizer((state) => applied.push(state));
  const latest = { visibleIds: new Set(["paper:openvla"]), selectedId: "paper:openvla" };
  synchronizer.setState({ visibleIds: new Set(["paper:pi0"]), selectedId: "paper:pi0" });
  synchronizer.setState(latest);
  assert.deepEqual(applied, []);
  synchronizer.setReady(true);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].selectedId, "paper:openvla");
  synchronizer.dispose();
  synchronizer.setState({ visibleIds: new Set(), selectedId: null });
  assert.equal(applied.length, 1);
});

test("model and dataset graph links resolve to stable comparison anchors", async () => {
  const models = await readFile("dist/models/index.html", "utf8");
  const datasets = await readFile("dist/datasets/index.html", "utf8");
  assert.match(models, /id="model-openvla"/);
  assert.match(datasets, /id="dataset-open-x-embodiment"/);
  assert.equal((models.match(/data-comparison-anchor="model-openvla"/g) ?? []).length, 2);
  assert.equal((datasets.match(/data-comparison-anchor="dataset-open-x-embodiment"/g) ?? []).length, 2);
  assert.equal((models.match(/id="model-openvla"/g) ?? []).length, 1);
  assert.equal((datasets.match(/id="dataset-open-x-embodiment"/g) ?? []).length, 1);
  assert.match(models, /focusComparisonAnchor/);
  assert.match(datasets, /scrollIntoView/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
