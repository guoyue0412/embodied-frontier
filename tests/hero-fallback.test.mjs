import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("hero meaning is present without hydration", async () => {
  const html = await readFile("dist/index.html", "utf8");
  assert.match(html, /把具身智能研究/);
  assert.match(html, /进入论文档案/);
  assert.match(html, /data-static-hero/);
});
