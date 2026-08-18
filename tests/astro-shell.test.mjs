import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { withBase } from "../src/lib/site-path.mjs";

const html = await readFile("dist/migration-check/index.html", "utf8");
const base = process.env.BASE_PATH && process.env.BASE_PATH !== "/"
  ? `/${process.env.BASE_PATH.replace(/^\/+|\/+$/g, "")}/`
  : "/";
const path = (value) => base === "/" ? `/${value.replace(/^\/+/, "")}` : `${base}${value.replace(/^\/+/, "")}`;
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("the migration route consumes the shared shell landmarks exactly once", () => {
  assert.equal((html.match(/<header\b/g) ?? []).length, 1);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.equal((html.match(/<footer\b/g) ?? []).length, 1);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /<main[^>]+id="main-content"/);
});

test("the built shell keeps internal links and the default OG image under the configured base", () => {
  for (const href of ["/", "/papers/", "/models/", "/datasets/", "/graph/", "/projects/", "/roadmap/", "/about/"]) {
    assert.match(html, new RegExp(`href="${path(href)}"`));
  }
  assert.match(html, new RegExp(`property="og:image" content="https://example\\.github\\.io${escapeRegExp(withBase("/og.png", base))}"`));
  assert.match(html, /研究内容以仓库中的 Markdown/);
  if (process.env.PUBLIC_REPOSITORY_URL) {
    assert.match(html, new RegExp(`href="${process.env.PUBLIC_REPOSITORY_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
});

test("the default OG image helper path is exact at root and GitHub Pages bases", () => {
  assert.equal(withBase("/og.png", "/"), "/og.png");
  assert.equal(withBase("/og.png", "/embodied-frontier/"), "/embodied-frontier/og.png");
});
