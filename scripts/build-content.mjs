import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileContent } from "./content-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = process.env.CONTENT_DIR ? path.resolve(process.env.CONTENT_DIR) : path.join(root, "content");
const outputFile = process.env.CONTENT_OUTPUT
  ? path.resolve(process.env.CONTENT_OUTPUT)
  : path.join(root, "generated", "content.json");

try {
  const payload = await compileContent({ contentDir, outputFile });
  console.log(
    `[content] ${payload.papers.length} papers · ${payload.roadmap.length} roadmap stages · ${payload.projects.length} projects · ${payload.models.length} models · ${payload.datasets.length} datasets`,
  );
} catch (error) {
  console.error(`[content] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
