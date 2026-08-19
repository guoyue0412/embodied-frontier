import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const USAGE = "usage: node scripts/write-codeowners.mjs @github-owner";
const OWNER_PATTERN = /^@[A-Za-z0-9-]+$/;

export function renderCodeowners(owner) {
  if (!OWNER_PATTERN.test(owner ?? "")) {
    throw new Error(USAGE);
  }
  return [
    `* ${owner}`,
    `src/content/ ${owner}`,
    `.github/workflows/ ${owner}`,
    `src/components/islands/ ${owner}`,
    `src/components/vendor/ ${owner}`,
    "",
  ].join("\n");
}

export async function writeCodeowners(owner, cwd = process.cwd()) {
  const content = renderCodeowners(owner);
  const githubDirectory = path.join(cwd, ".github");
  await mkdir(githubDirectory, { recursive: true });
  await writeFile(path.join(githubDirectory, "CODEOWNERS"), content, "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await writeCodeowners(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
