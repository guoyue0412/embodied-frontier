import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the design system exposes required semantic and motion tokens", async () => {
  const tokens = await readFile("src/styles/tokens.css", "utf8");
  const motion = await readFile("src/styles/motion.css", "utf8");
  for (const token of ["--space-void", "--energy-cyan", "--evidence-verified", "--panel-border", "--focus-ring"]) {
    assert.match(tokens, new RegExp(token));
  }
  assert.match(motion, /prefers-reduced-motion:\s*reduce/);
  assert.match(motion, /animation-duration:\s*0\.01ms/);
});
