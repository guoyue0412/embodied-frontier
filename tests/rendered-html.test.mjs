import assert from "node:assert/strict";
import test from "node:test";

async function render(route = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${route}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the research homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="zh-CN"/i);
  assert.match(html, /<title>具身智能研究坐标 · 具身前沿<\/title>/i);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /href="#main-content"[^>]*>跳到正文/);
  assert.match(html, /把具身智能研究/);
  assert.match(html, /VLA/);
  assert.match(html, /WAM/);
  assert.match(html, /Data &amp; Eval/);
  assert.match(html, /已核验/);
  assert.match(html, /作者自评/);
  assert.match(html, /待核/);
  assert.match(html, /http:\/\/localhost(?::3000)?\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("renders primary routes and a paper record", async () => {
  for (const route of ["/papers", "/roadmap", "/projects", "/about", "/papers/openvla"]) {
    const response = await render(route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.match(html, /具身前沿/, route);
  }
});

test("paper metadata is record-specific and does not inherit the site image", async () => {
  const response = await render("/papers/openvla");
  const html = await response.text();
  assert.match(html, /<title>OpenVLA · 具身前沿<\/title>/i);
  assert.match(html, /以公开权重和训练代码降低通用机器人策略研究门槛/);
  assert.doesNotMatch(html, /og\.png/);
});

test("unknown paper returns 404", async () => {
  const response = await render("/papers/not-a-paper");
  assert.equal(response.status, 404);
});
