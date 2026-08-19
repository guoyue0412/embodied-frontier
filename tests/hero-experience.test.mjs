import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateHeroCapabilities } from "../src/lib/hero-capabilities.mjs";

test("headless/no-fine-pointer capability selects an explicit fallback", () => {
  assert.deepEqual(evaluateHeroCapabilities({ reducedMotion: false, finePointer: false, viewportWidth: 1440 }), {
    status: "capability-fallback",
    enhanced: false,
  });
});

test("reduced motion and narrow viewports remain explicit fallbacks", () => {
  assert.equal(evaluateHeroCapabilities({ reducedMotion: true, finePointer: true, viewportWidth: 1440 }).status, "capability-fallback");
  assert.equal(evaluateHeroCapabilities({ reducedMotion: false, finePointer: true, viewportWidth: 767 }).status, "capability-fallback");
});

test("fine-pointer desktop capability enables the optional visual path", () => {
  assert.deepEqual(evaluateHeroCapabilities({ reducedMotion: false, finePointer: true, viewportWidth: 1440 }), {
    status: "enhanced",
    enhanced: true,
  });
});

test("HeroExperience exposes capability state instead of using data-enhanced as readiness", async () => {
  const source = await readFile("src/components/islands/HeroExperience.tsx", "utf8");
  assert.match(source, /evaluateHeroCapabilities/);
  assert.match(source, /data-hero-capability-state/);
  assert.match(source, /initializing/);
  assert.match(source, /capability-fallback/);
});
