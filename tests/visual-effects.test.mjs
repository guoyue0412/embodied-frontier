import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("research track cards expose a pointer spotlight with touch and reduced-motion fallbacks", async () => {
  const component = await readFile("src/components/static/ResearchTrackCard.astro", "utf8");
  const styles = await readFile("src/styles/global.css", "utf8");
  assert.match(component, /data-track-card/);
  assert.match(component, /pointermove/);
  assert.match(component, /prefers-reduced-motion/);
  assert.match(styles, /track-card::before/);
  assert.match(styles, /--track-card-pointer-x/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
