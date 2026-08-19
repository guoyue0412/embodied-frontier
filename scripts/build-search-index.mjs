import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSearchIndex } from "../src/lib/search-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentFile = path.join(root, "generated", "content.json");
const outputFile = path.join(root, "generated", "search-index.json");
const content = JSON.parse(await readFile(contentFile, "utf8"));
const index = buildSearchIndex(content.papers);
await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(index)}\n`, "utf8");
console.log(`[search] ${index.records.length} indexed papers`);
