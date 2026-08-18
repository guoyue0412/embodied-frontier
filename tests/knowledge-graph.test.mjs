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
