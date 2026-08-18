import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("papers remain discoverable before the search island hydrates", async () => {
  const html = await readFile("dist/papers/index.html", "utf8");
  for (const title of ["OpenVLA", "RT-2", "π0"]) assert.match(html, new RegExp(title));
  assert.match(html, /<noscript>[\s\S]*完整论文列表/);
  assert.match(html, /全文检索/);
});
