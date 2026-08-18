import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const required = [
  "index",
  "about/index",
  "papers/index",
  "models/index",
  "datasets/index",
  "graph/index",
  "projects/index",
  "roadmap/index",
];

const labels = { verified: "已核验", "self-reported": "作者自评", unverified: "待核" };
const content = JSON.parse(await readFile("generated/content.json", "utf8"));
const paperSlugs = content.papers.map((paper) => paper.slug);

async function readRoute(route) {
  return readFile(`dist/${route}.html`, "utf8").catch(() => readFile(`dist/${route}/index.html`, "utf8"));
}

test("Astro emits every public route with one main and one h1", async () => {
  for (const route of required) {
    const html = await readRoute(route);
    assert.equal((html.match(/<main\b/g) ?? []).length, 1, route);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, route);
  }
});

test("Astro emits every generated paper detail with record-specific evidence and sources", async () => {
  for (const paper of content.papers) {
    const html = await readRoute(`papers/${paper.slug}/index`);
    assert.equal((html.match(/<main\b/g) ?? []).length, 1, paper.slug);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, paper.slug);
    assert.match(html, new RegExp(`<title>${escapeRegExp(`${paper.title} · 具身前沿`)}<\\/title>`), paper.slug);
    assert.match(html, new RegExp(escapeRegExp(labels[paper.status])), paper.slug);
    for (const source of paper.sources) assert.match(html, new RegExp(escapeRegExp(source.url)), `${paper.slug}:${source.label}`);
    assert.match(html, /<h2 id="[^"]+">/, paper.slug);
    const prose = html.match(/<div class="prose">([\s\S]*?)<\/div>/)?.[1] ?? "";
    assert.doesNotMatch(prose, /<script\b|\son[a-z]+\s*=/i, paper.slug);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i, paper.slug);
    assert.doesNotMatch(html, /<h1\b[^>]*>[^<]+<\/h1>[\s\S]*<h1\b/i, paper.slug);
  }
});

test("unknown paper slugs do not produce static output", async () => {
  assert.equal(paperSlugs.includes("not-a-paper"), false);
  await assert.rejects(access("dist/papers/not-a-paper/index.html"));
});

test("homepage preserves evidence states, content counts, and complete paper discoverability", async () => {
  const homepage = await readFile("dist/index.html", "utf8");
  for (const label of Object.values(labels)) assert.match(homepage, new RegExp(label));
  assert.match(homepage, new RegExp(`论文笔记</dt><dd>${String(content.papers.length).padStart(2, "0")}</dd>`));
  assert.match(homepage, new RegExp(`项目现场</dt><dd>${String(content.projects.length).padStart(2, "0")}</dd>`));

  const papers = await readFile("dist/papers/index.html", "utf8");
  for (const paper of content.papers) {
    assert.match(papers, new RegExp(escapeRegExp(paper.title)));
    assert.match(papers, new RegExp(`href="[^"]*/papers/${paper.slug}/"`));
  }
});

test("comparison pages preserve protocol warnings, missing values, evidence, and sources", async () => {
  for (const route of ["models/index", "datasets/index"]) {
    const html = await readRoute(route);
    assert.match(html, /对比协议/);
    assert.match(html, /字段级证据/);
    assert.match(html, /暂无可靠值/);
    assert.match(html, /来源 ↗/);
    assert.match(html, /已核验|作者自评|待核/);
    assert.doesNotMatch(html, /class="[^"]*ranking/);
  }
});

test("graph renders generated data with the complete relationship fallback", async () => {
  const html = await readFile("dist/graph/index.html", "utf8");
  const graph = JSON.parse(await readFile("generated/knowledge-graph.json", "utf8"));
  assert.match(html, /关系清单/);
  assert.match(html, /加载关系图/);
  assert.match(html, new RegExp(`${graph.nodes.length} 个节点、${graph.edges.length} 条显式关系`));
  for (const node of graph.nodes) assert.match(html, new RegExp(escapeRegExp(node.title)));
  assert.match(html, /describes/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
