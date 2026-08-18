import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildKnowledgeGraph } from "../lib/graph-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const content = JSON.parse(await readFile(path.join(root, "generated", "content.json"), "utf8"));
const graph = buildKnowledgeGraph(content);
await writeFile(path.join(root, "generated", "knowledge-graph.json"), `${JSON.stringify(graph)}\n`, "utf8");
console.log(`[graph] ${graph.nodes.length} nodes · ${graph.edges.length} edges`);
