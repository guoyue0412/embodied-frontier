import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const home = await readFile("dist/index.html", "utf8");
const gallery = await readFile("dist/demos/index.html", "utf8").catch(() => "");
const base = process.env.BASE_PATH && process.env.BASE_PATH !== "/"
  ? `/${process.env.BASE_PATH.replace(/^\/+|\/+$/g, "")}/`
  : "/";
const path = (value) => base === "/" ? `/${value.replace(/^\/+/, "")}` : `${base}${value.replace(/^\/+/, "")}`;

test("Demo Lab is a primary tab with a published-card or honest empty state", async () => {
  assert.match(home, new RegExp(`href=["'][^"']*${path("/demos/").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`));
  assert.match(gallery, /Demo Lab|作品实验室/);
  assert.match(gallery, /匿名化|媒体授权/);
  assert.equal((gallery.match(/<main\b/g) ?? []).length, 1);
  assert.equal((gallery.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(gallery, /<video\b|<iframe\b/);
  const gallerySource = await readFile("src/pages/demos/index.astro", "utf8");
  assert.match(gallerySource, /尚无已审核并公开的 Demo/);
  assert.match(gallery, /data-demo-card|data-demo-empty-state/);
  await assert.rejects(access("dist/demos/not-a-demo/index.html"));
});

test("forbidden organization fields are encoded in the strict Demo schema", async () => {
  const source = await readFile("src/content.config.ts", "utf8");
  assert.match(source, /const demos = defineCollection\(/);
  for (const key of ["company", "employer", "client"]) {
    assert.match(source, new RegExp(`${key}:\\s*z\\.never\\(\\)\\.optional\\(\\)`));
  }
  assert.match(source, /anonymized:\s*z\.literal\(true\)/);
  assert.match(source, /public:\s*z\.literal\(true\)/);
  assert.match(source, /mediaRights:\s*z\.enum\(\["original", "authorized", "open-licensed"\]\)/);
  assert.match(source, /disclosure:\s*z\.literal\(/);
});

test("Demo routes and empty collection marker are present", async () => {
  await access("src/content/demos/.gitkeep");
  await access("src/pages/demos/index.astro");
  await access("src/pages/demos/[slug].astro");
  assert.match(home, new RegExp(`href=["']${path("/demos/").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`));
});
