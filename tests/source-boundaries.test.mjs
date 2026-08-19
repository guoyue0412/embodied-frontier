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

test("keeps runtime dependencies bounded and independently branded", async () => {
  // Quality gates are intentionally allowed to mention their own package
  // boundaries; this assertion protects the shipped runtime source tree.
  const files = (await Promise.all([sourceFiles("src"), sourceFiles("lib")])).flat();
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  const allowedThreeConsumers = files.filter((file) => /src[\\/]lib[\\/]three[\\/]create-embodiment-scene\.ts$|src[\\/]components[\\/]islands[\\/]EmbodimentUnit\.tsx$|src[\\/]components[\\/]vendor[\\/]react-bits[\\/]GridDistortion[\\/]GridDistortion\.tsx$/.test(file));
  const boundedSource = (await Promise.all(files.filter((file) => !allowedThreeConsumers.includes(file)).map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(boundedSource, /three(?:\.js)?|WebGL|react-loading-skeleton|具身星图/i);
  assert.match(source, /createEmbodimentScene/);
  assert.doesNotMatch(source, /zhuyun97|embodied-ai-learning/i);
});

test("does not request research content from a runtime API", async () => {
  // Browser QA and build scripts are tooling; only the shipped source tree is a runtime boundary.
  const files = (await Promise.all([sourceFiles("src"), sourceFiles("lib")])).flat();
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource/);
});
