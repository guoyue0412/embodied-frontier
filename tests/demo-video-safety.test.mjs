import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("Demo video uses native controls and base-safe media paths", async () => {
  const source = await readFile("src/components/static/DemoVideo.astro", "utf8").catch(() => "");
  assert.match(source, /<video\b/);
  assert.match(source, /controls/);
  assert.match(source, /playsinline/);
  assert.match(source, /preload=["']metadata["']/);
  assert.match(source, /poster=\{withBase\(video\.poster\)\}/);
  assert.match(source, /withBase\(video\.(?:webm|mp4|captions)\)/);
  assert.match(source, /<track\b/);
  assert.doesNotMatch(source, /autoplay|\bloop\b|<iframe\b|set:html/);
});

test("Demo gallery cards use posters instead of playable video lists", async () => {
  const source = await readFile("src/components/static/DemoCard.astro", "utf8").catch(() => "");
  assert.match(source, /demo\.video\?\.poster/);
  assert.match(source, /demo\.mediaGroups\?\.\[0\]/);
  assert.match(source, /withBase\(poster\)/);
  assert.match(source, /<img\b/);
  assert.doesNotMatch(source, /<video\b|<iframe\b|set:html/);
});

test("Demo media asset contracts stay under the public videos path", async () => {
  const source = await readFile("src/content.config.ts", "utf8");
  assert.ok(source.includes("const demoVideoAsset = z.string().regex(/^\\/videos\\/"));
  assert.ok(source.includes("const demoPosterAsset = z.string().regex(/^\\/videos\\/"));
  assert.ok(source.includes("const demoCaptionAsset = z.string().regex(/^\\/videos\\/"));
  assert.match(source, /video requires webm or mp4/);
});

test("public Demo media contains no Git LFS pointer files", async () => {
  const files = await readdir("public/videos", { withFileTypes: true }).catch(() => []);
  for (const file of files) {
    if (!file.isFile()) continue;
    const header = await readFile(`public/videos/${file.name}`, "utf8").then((value) => value.slice(0, 160));
    assert.doesNotMatch(header, /^version https:\/\/git-lfs\.github\.com\/spec\/v1\n(?:oid sha256:|size )/);
  }
});
