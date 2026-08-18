import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("vendored visual code records its upstream and license", async () => {
  const notices = await readFile("THIRD_PARTY_NOTICES.md", "utf8");
  assert.match(notices, /DavidHDev\/react-bits/);
  assert.match(notices, /MIT \+ Commons Clause/);
  for (const name of ["Shuffle", "DotGrid", "GridDistortion"]) assert.match(notices, new RegExp(name));
});
