import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
      () => checkStaticSite(root, { basePath: "/" }),
      (error) => error.report?.errors.some((message) => message.includes("internal target not found"))
        && error.report.errors.some((message) => message.includes("interactive control has no accessible name"))
        && error.report.errors.some((message) => message.includes("image is missing alt text")),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("static checker resolves relative links from each nested document URL", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "embodied-frontier-static-nested-"));
  try {
    await mkdir(path.join(root, "papers", "openvla"), { recursive: true });
    const page = (link) => `<!doctype html><html lang="en"><head><title>fixture</title></head><body><main><h1>Fixture</h1><a href="${link}">OpenVLA</a></main></body></html>`;
    await writeFile(path.join(root, "index.html"), page("papers/"));
    await writeFile(path.join(root, "papers", "index.html"), page("openvla/"));
    await writeFile(path.join(root, "papers", "openvla", "index.html"), page("../"));
    assert.equal((await checkStaticSite(root, { basePath: "/" })).errors.length, 0);
    await writeFile(path.join(root, "papers", "index.html"), page("missing/"));
    await assert.rejects(
      () => checkStaticSite(root, { basePath: "/" }),
      (error) => error.report?.errors.some((message) => message.includes("internal target not found")),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("static checker rejects unsafe URLs and duplicate landmarks", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "embodied-frontier-static-negative-"));
  try {
    await writeFile(path.join(root, "index.html"), '<!doctype html><html lang="en"><head><title>fixture</title></head><body><main><h1>One</h1><h1>Two</h1><a href="javascript:alert(1)">unsafe</a></main><main><h2>Extra</h2></main></body></html>');
    await assert.rejects(
      () => checkStaticSite(root, { basePath: "/" }),
      (error) => error.report?.errors.some((message) => message.includes("javascript: URL"))
        && error.report.errors.some((message) => message.includes("expected exactly one <main>"))
        && error.report.errors.some((message) => message.includes("expected exactly one <h1>")),
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
