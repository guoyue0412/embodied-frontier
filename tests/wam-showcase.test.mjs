import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const base = process.env.BASE_PATH && process.env.BASE_PATH !== "/"
  ? `/${process.env.BASE_PATH.replace(/^\/+|\/+$/g, "")}`
  : "";
const html = await readFile("dist/demos/wam-generation-showcase/index.html", "utf8").catch(() => "");

test("WAM showcase publishes two GT/Pred comparisons and one OpenArm demo", async () => {
  assert.match(html, /WAM 生成与实机展示/);
  assert.match(html, /AgiBotBeta/);
  assert.match(html, /RoboTwinHD/);
  assert.match(html, /OpenArm/);
  assert.equal((html.match(/<video\b/g) ?? []).length, 5);
  assert.equal((html.match(/preload="metadata"/g) ?? []).length, 5);
  assert.equal((html.match(/playsinline/g) ?? []).length, 5);
  assert.doesNotMatch(html, /autoplay|<iframe\b/);

  for (const name of [
    "agibotbeta-idx005-gt.mp4",
    "agibotbeta-idx005-pred.mp4",
    "robotwinhd-idx206-gt.mp4",
    "robotwinhd-idx206-pred.mp4",
    "openarm.mp4",
  ]) {
    assert.match(html, new RegExp(`src="${base}/videos/wam/${name}"`));
    await access(`public/videos/wam/${name}`);
  }
});

test("WAM showcase keeps evidence and interpretation boundaries explicit", async () => {
  const record = await readFile("src/content/demos/wam-generation-showcase.md", "utf8");
  assert.match(record, /用户提供/);
  assert.match(record, /不构成定量评测结论/);
  assert.match(record, /mediaRights:\s*authorized/);
  assert.doesNotMatch(record, /company:|employer:|client:/);
});

test("OpenArm is disclosed as a three-times-speed public encode", async () => {
  const record = await readFile("src/content/demos/wam-generation-showcase.md", "utf8");
  assert.match(record, /3× speed/);
  assert.match(record, /约 7\.4 秒/);
});

test("Demo schema supports typed comparison and single-video media groups", async () => {
  const schema = await readFile("src/content.config.ts", "utf8");
  assert.match(schema, /mediaGroups:/);
  assert.match(schema, /z\.enum\(\["comparison", "single"\]\)/);
  assert.match(schema, /items:\s*z\.array\(/);
  assert.match(schema, /label:\s*z\.string\(\)\.min\(1\)/);
});
