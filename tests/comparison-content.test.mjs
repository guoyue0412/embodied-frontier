import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { compileContent } from "../scripts/content-core.mjs";
import { compareMetric } from "../lib/comparison-core.mjs";

const base = {
  papers: `---\ntitle: Paper\nslug: paper\ndate: "2024-01-01"\nupdated: "2026-08-18"\ntrack: VLA\nvenue: Test\nstatus: verified\ntags: [test]\nsummary: Paper.\nsources: [{ label: Paper, url: "https://example.com/paper" }]\nrelations: []\n---\nBody.`,
  roadmap: `---\ntitle: Stage\nslug: stage\norder: 1\nlabel: Stage\nduration: 1 week\nsummary: Stage.\ngoals: [Learn]\noutputs: [Note]\nreading: [paper]\n---\nBody.`,
  projects: `---\ntitle: Project\nslug: project\nupdated: "2026-08-18"\nstatus: active\nquestion: Why?\nsummary: Project.\nevidence: [Test]\nnext: Continue.\n---\nBody.`,
  models: `---\ntitle: Model A\nslug: model-a\nupdated: "2026-08-18"\nfamily: VLA\norganization: Lab\nlicense: Apache-2.0\nprotocol: robot-suite-v1\nsummary: Model.\ninputs: [vision, language]\noutputs: [actions]\nrelations: [{ target: "paper:paper", type: "described-by" }]\nfacts:\n  parameters: { value: 7, unit: billion-parameters, status: self-reported, source: "https://example.com/model" }\n  action_horizon: { value: null, unit: steps, status: unverified, source: "https://example.com/model" }\n---\nBody.`,
  datasets: `---\ntitle: Dataset A\nslug: dataset-a\nupdated: "2026-08-18"\norganization: Lab\nlicense: CC-BY-4.0\nprotocol: robot-suite-v1\nsummary: Dataset.\nmodalities: [rgb, actions]\nrelations: [{ target: "model:model-a", type: "trains" }]\nfacts:\n  trajectories: { value: 60000, unit: trajectories, status: verified, source: "https://example.com/dataset" }\n  embodiments: { value: 1, unit: embodiments, status: verified, source: "https://example.com/dataset" }\n---\nBody.`,
};

async function fixture(t, overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ef-comparison-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const section of Object.keys(base)) {
    await mkdir(path.join(root, section));
    await writeFile(path.join(root, section, "record.md"), overrides[section] ?? base[section]);
  }
  return root;
}

test("compiles model and dataset facts with field-level evidence and missing values", async (t) => {
  const root = await fixture(t);
  const result = await compileContent({ contentDir: root, outputFile: path.join(root, "out.json") });
  assert.equal(result.models[0].facts.parameters.unit, "billion-parameters");
  assert.equal(result.models[0].facts.parameters.status, "self-reported");
  assert.equal(result.models[0].facts.action_horizon.value, null);
  assert.equal(result.datasets[0].facts.trajectories.value, 60000);
});

test("rejects unsupported units and evidence states", async (t) => {
  const unitRoot = await fixture(t, { models: base.models.replace("billion-parameters", "mystery-units") });
  await assert.rejects(() => compileContent({ contentDir: unitRoot, outputFile: path.join(unitRoot, "out.json") }), /unsupported unit/);

  const statusRoot = await fixture(t, { datasets: base.datasets.replace("status: verified", "status: certain") });
  await assert.rejects(() => compileContent({ contentDir: statusRoot, outputFile: path.join(statusRoot, "out.json") }), /status must be one of/);
});

test("refuses metric ranking when comparison protocols differ", () => {
  const result = compareMetric([
    { title: "A", protocol: "suite-a", facts: { success_rate: { value: 80, unit: "percent" } } },
    { title: "B", protocol: "suite-b", facts: { success_rate: { value: 90, unit: "percent" } } },
  ], "success_rate");
  assert.equal(result.comparable, false);
  assert.deepEqual(result.ranking, []);
  assert.match(result.warning, /协议不同/);
});

test("ranks numeric values only when protocol and unit match", () => {
  const result = compareMetric([
    { title: "A", protocol: "suite-a", facts: { success_rate: { value: 80, unit: "percent" } } },
    { title: "B", protocol: "suite-a", facts: { success_rate: { value: 90, unit: "percent" } } },
  ], "success_rate");
  assert.equal(result.comparable, true);
  assert.deepEqual(result.ranking.map((item) => item.title), ["B", "A"]);
});
