import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function normalize(value, key = "") {
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([entryKey]) => entryKey !== "artifactsDirectory" && entryKey !== "outputDirectory")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([entryKey, entryValue]) => [entryKey, normalize(entryValue, entryKey)]),
    );
  }
  return key === "file" && typeof value === "string" ? path.basename(value) : value;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function reportDigest(directory) {
  const source = await readFile(path.join(directory, "report.json"), "utf8");
  const normalized = normalize(JSON.parse(source));
  return hash(JSON.stringify(normalized));
}

async function screenshotDigests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const names = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".png")).map((entry) => entry.name).toSorted();
  return Object.fromEntries(await Promise.all(names.map(async (name) => [name, hash(await readFile(path.join(directory, name)))])));
}

export async function compareBrowserArtifacts(firstDirectory, secondDirectory) {
  const [firstReport, secondReport, firstScreenshots, secondScreenshots] = await Promise.all([
    reportDigest(firstDirectory),
    reportDigest(secondDirectory),
    screenshotDigests(firstDirectory),
    screenshotDigests(secondDirectory),
  ]);
  const screenshotNames = [...new Set([...Object.keys(firstScreenshots), ...Object.keys(secondScreenshots)])].toSorted();
  const screenshots = Object.fromEntries(screenshotNames.map((name) => [name, {
    firstSha256: firstScreenshots[name] ?? null,
    secondSha256: secondScreenshots[name] ?? null,
    equal: firstScreenshots[name] === secondScreenshots[name],
  }]));
  const reportsEqual = firstReport === secondReport;
  const screenshotsEqual = Object.values(screenshots).every(({ equal }) => equal);
  if (!reportsEqual || !screenshotsEqual) {
    const mismatch = [
      !reportsEqual ? "normalized report" : null,
      ...Object.entries(screenshots).filter(([, result]) => !result.equal).map(([name]) => `screenshot ${name}`),
    ].filter(Boolean).join(", ");
    throw new Error(`browser artifact mismatch: ${mismatch}`);
  }
  return { status: "ok", reportSha256: firstReport, screenshots };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [firstDirectory, secondDirectory] = process.argv.slice(2);
  if (!firstDirectory || !secondDirectory) {
    console.error("usage: node scripts/compare-browser-qa.mjs <first-artifacts> <second-artifacts>");
    process.exitCode = 2;
  } else {
    try {
      console.log(JSON.stringify(await compareBrowserArtifacts(firstDirectory, secondDirectory), null, 2));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
