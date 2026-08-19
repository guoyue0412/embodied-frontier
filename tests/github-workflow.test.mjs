import test from "node:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const execFile = promisify(execFileCallback);
const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const generator = path.join(repositoryRoot, "scripts/write-codeowners.mjs");

test("verification runs on pull requests with a read-only contents permission", async () => {
  const yaml = await readFile(".github/workflows/verify.yml", "utf8");
  assert.match(yaml, /pull_request:/);
  assert.match(yaml, /actions\/checkout@v4/);
  assert.match(yaml, /actions\/setup-node@v4/);
  assert.match(yaml, /node-version:\s*22/);
  assert.match(yaml, /cache:\s*npm/);
  assert.match(yaml, /npm ci/);
  assert.match(yaml, /npm run verify/);
  assert.match(yaml, /contents:\s*read/);
  assert.match(yaml, /if:\s*success\(\)/);
  assert.match(yaml, /path:\s*dist\//);
  assert.match(yaml, /path:\s*artifacts\/browser-qa\//);
  assert.doesNotMatch(yaml, /pages:\s*write/);
});

test("Pages deploys only from main with official artifact actions", async () => {
  const yaml = await readFile(".github/workflows/deploy-pages.yml", "utf8");
  assert.match(yaml, /branches:\s*\[main\]/);
  assert.match(yaml, /workflow_dispatch:/);
  assert.match(yaml, /actions\/checkout@v4/);
  assert.match(yaml, /actions\/setup-node@v4/);
  assert.match(yaml, /actions\/configure-pages@v5/);
  assert.match(yaml, /actions\/upload-pages-artifact@v4/);
  assert.match(yaml, /actions\/deploy-pages@v4/);
  assert.match(yaml, /environment:[\s\S]*github-pages/);
});

test("manual Pages dispatch cannot deploy from a non-main ref", async () => {
  const yaml = await readFile(".github/workflows/deploy-pages.yml", "utf8");
  const mainGuard = "if: github.ref == 'refs/heads/main'";
  assert.equal(yaml.split(mainGuard).length - 1, 2, "build and deploy must both guard the main ref");
  const buildJob = yaml.match(/\n {2}build:\n([\s\S]*?)\n {2}deploy:/)?.[1] ?? "";
  const deployJob = yaml.match(/\n {2}deploy:\n([\s\S]*)$/)?.[1] ?? "";
  assert.match(buildJob, new RegExp(mainGuard.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  assert.match(deployJob, new RegExp(mainGuard.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  assert.match(deployJob, /needs:\s*build/);
});

test("PR template records source, evidence, visual, verification, and deployment review", async () => {
  const template = await readFile(".github/pull_request_template.md", "utf8");
  for (const field of [
    "Content sources",
    "Evidence status",
    "Third-party license",
    "Desktop screenshot",
    "Mobile screenshot",
    "Reduced-motion result",
    "npm run verify",
    "Deployment impact",
  ]) {
    assert.match(template, new RegExp(`- \\[ \\].*${field}`, "i"), `missing PR field: ${field}`);
  }
});

test("CODEOWNERS generator rejects missing or guessed owners", async () => {
  const workdir = await mkdtemp(path.join(os.tmpdir(), "embodied-frontier-codeowners-"));
  try {
    await assert.rejects(
      execFile(process.execPath, [generator], { cwd: workdir }),
      /usage: node scripts\/write-codeowners\.mjs @github-owner/,
    );
    await assert.rejects(
      execFile(process.execPath, [generator, "guessed-owner"], { cwd: workdir }),
      /usage: node scripts\/write-codeowners\.mjs @github-owner/,
    );
    await assert.rejects(access(path.join(workdir, ".github", "CODEOWNERS")));
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
});

test("CODEOWNERS generator writes every protected path for an explicit owner", async () => {
  const workdir = await mkdtemp(path.join(os.tmpdir(), "embodied-frontier-codeowners-"));
  try {
    await execFile(process.execPath, [generator, "@guoyue0412"], { cwd: workdir });
    const codeowners = await readFile(path.join(workdir, ".github", "CODEOWNERS"), "utf8");
    assert.equal(
      codeowners,
      "* @guoyue0412\n" +
        "src/content/ @guoyue0412\n" +
        ".github/workflows/ @guoyue0412\n" +
        "src/components/islands/ @guoyue0412\n" +
        "src/components/vendor/ @guoyue0412\n",
    );
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
});

test("README documents GitHub flow, Pages setup, manual review, and deployment evidence boundaries", async () => {
  const readme = await readFile("README.md", "utf8");
  for (const phrase of [
    "git clone",
    "src/content/papers",
    "Pull Request",
    "GitHub Pages",
    "verify",
    "人工审核",
    "本地构建不等于部署证据",
  ]) {
    assert.match(readme, new RegExp(phrase.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "i"), `missing README guidance: ${phrase}`);
  }
});
