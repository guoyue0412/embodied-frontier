import assert from "node:assert/strict";
import test from "node:test";
import { buildSearchIndex, filtersFromSearchParams, filtersToSearchParams, searchRecords, trackHeadingId } from "../src/lib/search-core.mjs";

const papers = [
  {
    slug: "openvla",
    title: "OpenVLA",
    summary: "开放权重视觉语言动作模型",
    track: "VLA",
    venue: "arXiv 2024",
    updated: "2026-08-18",
    status: "verified",
    tags: ["open-source", "robot manipulation"],
    text: "通用机器人策略",
  },
  {
    slug: "diffusion-policy",
    title: "Diffusion Policy",
    summary: "以扩散过程建模多模态动作分布",
    track: "Policy Learning",
    venue: "RSS 2023",
    updated: "2026-07-01",
    status: "self-reported",
    tags: ["diffusion", "imitation learning"],
    text: "动作序列生成",
  },
];

test("builds a deterministic compact index with Chinese and English text", () => {
  const first = buildSearchIndex(papers);
  const second = buildSearchIndex([...papers].reverse());
  assert.deepEqual(first, second);
  assert.equal(first.version, 1);
  const openvla = first.records.find((record) => record.slug === "openvla");
  assert.match(openvla.haystack, /openvla/);
  assert.match(openvla.haystack, /视觉语言动作模型/);
});

test("searches Chinese and English queries case-insensitively", () => {
  const index = buildSearchIndex(papers);
  assert.deepEqual(searchRecords(index.records, { query: "视觉语言" }).map((item) => item.slug), ["openvla"]);
  assert.deepEqual(searchRecords(index.records, { query: "DIFFUSION" }).map((item) => item.slug), ["diffusion-policy"]);
});

test("intersects track, tag, year, venue, and evidence filters", () => {
  const index = buildSearchIndex(papers);
  const result = searchRecords(index.records, {
    track: "VLA",
    tag: "open-source",
    year: "2024",
    venue: "arXiv 2024",
    status: "verified",
  });
  assert.deepEqual(result.map((item) => item.slug), ["openvla"]);
  assert.equal(searchRecords(index.records, { track: "VLA", status: "unverified" }).length, 0);
});

test("restores known filters from URL parameters and ignores unknown values", () => {
  const filters = filtersFromSearchParams(new URLSearchParams("q=robot&track=VLA&tag=open-source&year=2024&venue=arXiv+2024&status=verified&junk=x"));
  assert.deepEqual(filters, {
    query: "robot",
    track: "VLA",
    tag: "open-source",
    year: "2024",
    venue: "arXiv 2024",
    status: "verified",
  });
});

test("canonicalizes query output while accepting the legacy query key", () => {
  const filters = { query: "robot", track: "VLA" };
  assert.equal(filtersToSearchParams(filters).toString(), "q=robot&track=VLA");
  assert.deepEqual(filtersFromSearchParams(new URLSearchParams("query=robot&track=VLA")), filters);
});

test("keeps Unicode research track heading IDs collision-safe", () => {
  assert.notEqual(trackHeadingId("视觉"), trackHeadingId("数据"));
  assert.equal(trackHeadingId(""), "research-track-empty");
});
