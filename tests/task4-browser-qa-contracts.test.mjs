import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Task 4 browser QA covers the Atlas and Demo Lab acceptance profiles", async () => {
  const source = await readFile("scripts/browser-qa.mjs", "utf8");

  for (const route of ["/", "/demos"]) assert.match(source, new RegExp(`\\"${route.replace("/", "\\/")}\\"`));
  for (const screenshot of ["desktop-home", "desktop-demos", "mobile-home", "mobile-demos", "reduced-motion-home"]) {
    assert.match(source, new RegExp(`screenshot\\(\\"${screenshot}\\"`));
  }
  for (const profile of ["desktop", "mobile-touch", "desktop-reduced-motion", "no-javascript"]) assert.match(source, new RegExp(`(?:name: "${profile}"|"${profile}")`));

  assert.match(source, /runNavigator\(desktop\.name\)/);
  assert.match(source, /expectedCount \?\? 7/);
  assert.match(source, /ariaCurrentCount === 0/);
  assert.match(source, /runNavigatorInteractions\(desktop\.name\)/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /data-atlas-navigator-mode/);
  assert.match(source, /navigator\.mode === "static"/);
  assert.match(source, /static atlas navigator nodes have no transition/);

  for (const selector of ["data-demo-gallery", "data-demo-empty-state", "data-demo-card", "data-demo-detail"]) assert.match(source, new RegExp(selector));
  for (const selector of [".demos-grid", ".demo-empty", ".demo-card", ".demo-detail"]) assert.match(source, new RegExp(selector.replace(".", "\\.")));
  assert.match(source, /Demo Lab gallery exposes an honest empty state or approved records/);
  assert.match(source, /Demo Lab detail video check is correctly gated until records exist/);
  assert.match(source, /same-origin static assets without content-fetch dependencies/);
  assert.match(source, /video\.hasAttribute\("controls"\)/);
  assert.match(source, /video\.hasAttribute\("playsinline"\)/);
  assert.match(source, /getAttribute\("preload"\) === "metadata"/);
  assert.match(source, /video\.getAttribute\("poster"\)/);
  assert.match(source, /video\.getAttribute\("aria-label"/);
  assert.match(source, /video\[autoplay\], video\[loop\]/);
  assert.match(source, /iframe/);
  assert.match(source, /sourcesBaseSafe/);

  assert.match(source, /setScriptExecutionDisabled/);
  assert.match(source, /static atlas navigator retains the Demo Lab destination without JavaScript/);
  assert.match(source, /Demo Lab remains readable without JavaScript/);
});
