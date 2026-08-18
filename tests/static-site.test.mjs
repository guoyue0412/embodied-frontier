import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkStaticSite } from "../scripts/check-static-site.mjs";

test("production HTML passes deterministic landmarks, links, media, and control-name checks", async () => {
  const report = await checkStaticSite("dist");
  assert.equal(report.errors.length, 0);
  assert.ok(report.files >= 10);
});

test("static checker reports broken internal targets and unlabeled controls", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "embodied-frontier-static-"));
  try {
    await writeFile(path.join(root, "index.html"), `<!doctype html><html lang="zh-CN"><head><title>fixture</title></head><body><main><h1>Fixture</h1><a href="/missing/">Missing</a><button></button><img src="/asset.png"></main></body></html>`);
    await assert.rejects(
      () => checkStaticSite(root),
      (error) => error.report?.errors.some((message) => message.includes("internal target not found"))
        && error.report.errors.some((message) => message.includes("interactive control has no accessible name"))
        && error.report.errors.some((message) => message.includes("image is missing alt text")),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("static HTML keeps no-JS research fallbacks visible", async () => {
  const papers = await import("node:fs/promises").then(({ readFile }) => readFile("dist/papers/index.html", "utf8"));
  const graph = await import("node:fs/promises").then(({ readFile }) => readFile("dist/graph/index.html", "utf8"));
  assert.match(papers, /完整论文列表已由页面静态输出/);
  assert.match(graph, /完整关系清单/);
  assert.match(graph, /加载交互图谱/);
});
