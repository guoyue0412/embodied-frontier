import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("src/components/islands/PaperExplorer.tsx", "utf8");

test("paper explorer keeps its progressive-enhancement interaction contract", () => {
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /data-search-controls/);
  assert.match(source, /searchRecords\(index, filters\)/);
  assert.match(source, /function clearFilters/);
  assert.match(source, /replaceUrl\(\{\}\)/);
  assert.match(source, /filtersToSearchParams/);
  assert.match(source, /history\.replaceState/);
});
