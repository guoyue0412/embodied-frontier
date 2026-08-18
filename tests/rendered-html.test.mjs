import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const required = [
  "index",
  "about/index",
  "papers/index",
  "models/index",
  "datasets/index",
  "graph/index",
  "projects/index",
  "roadmap/index",
  "papers/openvla/index",
];

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

test("paper pages expose evidence and source links", async () => {
  const html = await readFile("dist/papers/openvla/index.html", "utf8");
  assert.match(html, /已核验/);
  assert.match(html, /https:\/\/arxiv\.org\//);
});
