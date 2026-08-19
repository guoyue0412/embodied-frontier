import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseProfileMarkdown } from "../src/lib/profile-content.mjs";

test("the public profile is backed by a privacy-safe repository Markdown source", async () => {
  const source = await readFile("src/content/profile.md", "utf8");
  const profile = parseProfileMarkdown(source);
  assert.equal(profile.evidence, "self-reported");
  assert.ok(profile.capabilities.length >= 4);
  assert.match(source, /World Action Model/);
  assert.match(source, /Video2World/);
  assert.match(source, /HIT Shenzhen|哈尔滨工业大学（深圳）/);
  assert.match(source, /国家奖学金/);
  assert.match(source, /中国机器人大赛国家一等奖/);
  assert.match(source, /WAM architecture \/ data alignment/);
  assert.match(source, /VLA end-to-end workflow/);
  assert.match(source, /Differentiable BPTT \/ Sim-to-Real/);
  assert.match(source, /AutoResearch experiment automation/);
  assert.match(source, /self-reported/);
  assert.doesNotMatch(source, /1[3-9]\d{9}|@[\w.-]+\.[A-Za-z]{2,}/);
  assert.doesNotMatch(source, /智源|道通|BAAI|Colugo|智元|A800|G1|D455/i);
  assert.doesNotMatch(source, /70%|96\.6|2\.6x|24h|<\s*5%|76\.6/i);
  assert.doesNotMatch(source, /\/Users\/|\/home\/|private\/|screenshot/i);
});

test("profile parsing fails closed for private evidence and unsupported status", async () => {
  const source = await readFile("src/content/profile.md", "utf8");
  assert.throws(() => parseProfileMarkdown(source.replace("self-reported", "verified")), /evidence must be self-reported/);
  assert.throws(() => parseProfileMarkdown(source.replace("World Action Model", "World Action Model · 15938356332")), /private or withheld evidence/);
});

test("the built About page exposes the profile and capability matrix without private evidence", async () => {
  const html = await readFile("dist/about/index.html", "utf8");
  assert.match(html, /id="public-profile"/);
  assert.match(html, /World Action Model/);
  assert.match(html, /Video2World/);
  assert.match(html, /Future latent|future latent/i);
  assert.match(html, /PyTorch/);
  assert.match(html, /JAX/);
  assert.match(html, /ROS2/);
  assert.match(html, /LIBERO/);
  assert.match(html, /国家奖学金/);
  assert.match(html, /吉林大学优秀毕业生/);
  assert.match(html, /中国大学生工程实践与创新能力大赛金奖/);
  assert.match(html, /中国机器人大赛国家一等奖/);
  assert.match(html, /data-profile-honor/);
  assert.match(html, /data-profile-practice-lane/);
  assert.match(html, /WAM architecture \/ data alignment/);
  assert.match(html, /VLA end-to-end workflow/);
  assert.match(html, /Differentiable BPTT \/ Sim-to-Real/);
  assert.match(html, /AutoResearch experiment automation/);
  assert.match(html, /self-reported/);
  assert.doesNotMatch(html, /159-3835-6332|1601954018@qq\.com|智源|道通|BAAI|Colugo|智元|A800|G1|D455/i);
  assert.doesNotMatch(html, /70%|96\.6|2\.6x|24h|<\s*5%|76\.6/i);
  assert.doesNotMatch(html, /\/Users\/|\/home\/|private\/|screenshot/i);
});

test("the profile matrix keeps public evidence boundaries explicit", async () => {
  const html = await readFile("dist/about/index.html", "utf8");
  assert.match(html, /个人简历与自我介绍材料/);
  assert.match(html, /未在本站独立复核|待协议复核/);
  assert.match(html, /data-profile-evidence="self-reported"/);
  assert.match(html, /data-profile-capability/);
});
