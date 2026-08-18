import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { validateRelations } from "../scripts/validate-relations.mjs";

test("all research Markdown lives under src/content", async () => {
  await access("src/content/papers/openvla.md");
  await assert.rejects(access("content/papers/openvla.md"));
});

test("relation validation rejects dangling targets", () => {
  assert.throws(
    () => validateRelations([{ id: "paper:a", relations: [{ target: "model:missing", type: "describes" }] }]),
    /paper:a.*model:missing/,
  );
});

test("Astro schemas retain the evidence enum", async () => {
  const source = await readFile("src/content.config.ts", "utf8");
  assert.match(source, /z\.enum\(\["verified", "self-reported", "unverified"\]\)/);
});
