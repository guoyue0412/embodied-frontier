import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { withBase } from "../src/lib/site-path.mjs";

test("the design system exposes required semantic and motion tokens", async () => {
  const tokens = await readFile("src/styles/tokens.css", "utf8");
  const motion = await readFile("src/styles/motion.css", "utf8");
  for (const token of ["--space-void", "--energy-cyan", "--evidence-verified", "--panel-border", "--focus-ring"]) {
    assert.match(tokens, new RegExp(token));
  }
  assert.match(motion, /prefers-reduced-motion:\s*reduce/);
  assert.match(motion, /animation-duration:\s*0\.01ms/);
  assert.match(motion, /transition-duration:\s*0\.01ms/);
});

test("the base-path helper joins root and GitHub Pages paths", () => {
  assert.equal(withBase("/"), "/");
  assert.equal(withBase("/", "/"), "/");
  assert.equal(withBase("/papers/", "/"), "/papers/");
  assert.equal(withBase("/", "/embodied-frontier/"), "/embodied-frontier/");
  assert.equal(withBase("/papers/", "/embodied-frontier/"), "/embodied-frontier/papers/");
});

test("the shared shell contract covers focus, provenance, controls, and mobile layout", async () => {
  const globalStyles = await readFile("src/styles/global.css", "utf8");
  const footer = await readFile("src/components/static/SiteFooter.astro", "utf8");
  const header = await readFile("src/components/static/SiteHeader.astro", "utf8");
  const layout = await readFile("src/layouts/SiteLayout.astro", "utf8");

  assert.match(globalStyles, /:focus-visible/);
  assert.match(globalStyles, /min-width:\s*44px/);
  assert.match(globalStyles, /min-height:\s*44px/);
  assert.match(globalStyles, /calc\(100% - 36px\)/);
  assert.match(globalStyles, /grid-template-columns:\s*1fr/);
  for (const match of globalStyles.matchAll(/border-radius:\s*([^;]+);/g)) {
    assert.match(match[1].trim(), /^var\(--radius-[\w-]+\)$/);
  }
  assert.match(footer, /PUBLIC_REPOSITORY_URL/);
  assert.match(footer, /Markdown/);
  assert.match(footer, /withBase\("\/about\/"\)/);
  assert.match(header, /site-path\.mjs/);
  assert.match(layout, /site-path\.mjs/);
});
