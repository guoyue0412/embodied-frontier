import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the embodiment island gates loading and exposes cleanup", async () => {
  const component = await readFile("src/components/islands/EmbodimentUnit.tsx", "utf8");
  const scene = await readFile("src/lib/three/create-embodiment-scene.ts", "utf8");
  assert.match(component, /min-width:\s*768px/);
  assert.match(component, /prefers-reduced-motion/);
  assert.match(component, /IntersectionObserver/);
  assert.match(scene, /dispose\(\)/);
  assert.match(scene, /renderer\.forceContextLoss/);
});
