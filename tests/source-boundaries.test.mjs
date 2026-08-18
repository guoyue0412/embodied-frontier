import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function sourceFiles(directory) {
  const absolute = new URL(`${directory}/`, root);
  const entries = await readdir(absolute, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(astro|mjs|ts|tsx|css)$/.test(entry.name))
    .filter((entry) => !/(?:^|[\\/])(?:generated|dist|vendor|node_modules)(?:[\\/]|$)/.test(entry.parentPath))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

test("keeps the stage-one runtime lightweight and independently branded", async () => {
  const files = (await Promise.all([sourceFiles("src"), sourceFiles("lib"), sourceFiles("scripts")])).flat();
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  // Task 6 explicitly introduces the licensed GridDistortion island; Three.js
  // remains forbidden here until the dedicated embodiment task owns it.
  assert.doesNotMatch(source, /three(?:\.js)?|WebGL|react-loading-skeleton|具身星图/i);
  assert.doesNotMatch(source, /zhuyun97|embodied-ai-learning/i);
});

test("does not request research content from a runtime API", async () => {
  // Browser QA and build scripts are tooling; only the shipped source tree is a runtime boundary.
  const files = (await Promise.all([sourceFiles("src"), sourceFiles("lib")])).flat();
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource/);
});
