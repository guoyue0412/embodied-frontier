import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Astro emits a static migration route", async () => {
  const html = await readFile("dist/migration-check/index.html", "utf8");
  assert.match(html, /<h1>Astro migration baseline<\/h1>/);
  assert.doesNotMatch(html, /__next|vinext|wrangler/i);
});
