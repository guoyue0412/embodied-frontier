import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("search QA waits for an explicit hydrated controls-ready marker", async () => {
  const component = await readFile("src/components/islands/PaperExplorer.tsx", "utf8");
  const browserQa = await readFile("scripts/browser-qa.mjs", "utf8");
  assert.match(component, /data-search-controls-ready=\{hydrated \? ["']true["'] : ["']false["']\}/);
  assert.match(browserQa, /data-search-controls-ready=["']true["']/);
  assert.match(browserQa, /waitFor\([^\n]*search-controls-ready/);
  assert.match(browserQa, /document\.activeElement === document\.querySelector/);
  assert.doesNotMatch(browserQa, /\{ ok: true, url: location\.search/);
});

test("hero visual QA exposes terminal distortion state and can freeze canvas animation", async () => {
  const browserQa = await readFile("scripts/browser-qa.mjs", "utf8");
  const distortion = await readFile("src/components/vendor/react-bits/GridDistortion/GridDistortion.tsx", "utf8");
  const dotGrid = await readFile("src/components/vendor/react-bits/DotGrid/DotGrid.tsx", "utf8");
  assert.match(browserQa, /__BROWSER_QA__/);
  assert.match(browserQa, /document\.fonts\?\.status/);
  assert.match(distortion, /data-visual-state/);
  assert.match(dotGrid, /__BROWSER_QA__/);
});
