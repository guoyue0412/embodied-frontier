import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("homepage exposes the complete atlas command deck", async () => {
  const html = await readFile("dist/index.html", "utf8");
  for (const id of ["atlas", "navigator", "vla", "wam", "data-eval", "method"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /SYSTEM ONLINE/);
  assert.match(html, /data-atlas-metric=/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
});
