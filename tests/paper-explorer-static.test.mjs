import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("papers remain discoverable before the search island hydrates", async () => {
  const html = await readFile("dist/papers/index.html", "utf8");
  const noScriptDom = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  for (const title of ["OpenVLA", "RT-2", "π0"]) assert.match(html, new RegExp(title));
  assert.equal((noScriptDom.match(/data-paper-slug=/g) ?? []).length, 5, "the no-script DOM has one card per paper");
  const fallback = noScriptDom.match(/<noscript\b[\s\S]*?<\/noscript>/i)?.[0] ?? "";
  assert.match(fallback, /完整论文列表/);
  assert.doesNotMatch(fallback, /data-paper-slug=/, "the noscript note does not duplicate the paper list");
  assert.match(noScriptDom, /data-search-controls="true"[^>]*hidden/);
  assert.match(noScriptDom, /全文检索/);
});
