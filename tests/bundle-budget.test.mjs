import test from "node:test";
import assert from "node:assert/strict";
import { checkBundleBudget } from "../scripts/check-bundle-budget.mjs";

test("initial interactive assets stay under 120 KB gzip", async () => {
  const report = await checkBundleBudget("dist");
  assert.ok(report.initialInteractiveGzip <= 120 * 1024, JSON.stringify(report));
  assert.equal(report.sharedIncludesThree, false);
  assert.equal(report.sharedIncludesCytoscape, false);
});
