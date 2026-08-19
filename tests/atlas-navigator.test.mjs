import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { computeAtlasPositions, nextAtlasIndex } from "../src/lib/atlas-navigator.mjs";

test("atlas positions and keyboard navigation are deterministic", () => {
  assert.deepEqual(computeAtlasPositions(4, 100), computeAtlasPositions(4, 100));
  const positions = computeAtlasPositions(4, 100);
  assert.equal(positions.length, 4);
  assert.ok(Math.abs(positions[0].x) < 1e-10);
  assert.equal(positions[0].y, -100);
  assert.equal(positions[1].x, 100);
  assert.ok(Math.abs(positions[1].y) < 1e-10);
  assert.equal(nextAtlasIndex(0, -1, 4), 3);
  assert.equal(nextAtlasIndex(3, 1, 4), 0);
});

test("atlas navigation handles empty or invalid inputs without producing a bad index", () => {
  assert.deepEqual(computeAtlasPositions(0, 100), []);
  assert.equal(nextAtlasIndex(0, 1, 0), 0);
  assert.equal(nextAtlasIndex(-1, 1, 4), 0);
  assert.equal(nextAtlasIndex(99, -1, 4), 2);
});

test("the navigator source stays static-first and lifecycle-aware", async () => {
  const source = await readFile("src/components/islands/AtlasNavigator.tsx", "utf8");
  assert.match(source, /data-atlas-navigator-ready/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /cancelAnimationFrame/);
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource/);
});

test("mobile capability evaluation keeps the navigator static and preview semantics stay honest", async () => {
  const source = await readFile("src/components/islands/AtlasNavigator.tsx", "utf8");
  const styles = await readFile("src/styles/hero.css", "utf8");
  const html = await readFile("dist/index.html", "utf8");
  const navigator = html.match(/<section id="navigator"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(source, /max-width:\s*767px.*pointer:\s*coarse/);
  assert.match(source, /staticCapabilityRef/);
  assert.match(source, /data-atlas-navigator-mode/);
  assert.match(source, /const shouldStop = staticMode \|\| pausedRef\.current \|\| shouldSuspend/);
  assert.match(source, /if \(shouldStop\) \{[\s\S]*?stopAnimation\(\)/);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.atlas-navigator__node\s*\{[\s\S]*?transition:\s*none/);
  assert.doesNotMatch(source, /aria-current/);
  assert.match(source, /aria-describedby/);
  assert.doesNotMatch(navigator, /aria-current=/);
  assert.match(navigator, /aria-describedby="atlas-active-preview"/);
});

test("the built homepage exposes one complete navigator link set", async () => {
  const html = await readFile("dist/index.html", "utf8");
  const navigator = html.match(/<section id="navigator"[\s\S]*?<\/section>/)?.[0] ?? "";
  const base = (process.env.BASE_PATH || "/").replace(/\/+$/, "");
  const route = (path) => `${base}${path}` || path;
  assert.match(navigator, /data-atlas-navigator/);
  assert.equal((navigator.match(/class="[^"]*\batlas-destination(?:\s|")/g) ?? []).length, 6);
  assert.equal((navigator.match(/data-atlas-navigator-static/g) ?? []).length, 0);
  for (const destination of ["/papers/", "/models/", "/datasets/", "/graph/", "/roadmap/", "/projects/"]) {
    assert.match(navigator, new RegExp(`href="${route(destination).replaceAll("/", "\\/")}"`));
  }
});
