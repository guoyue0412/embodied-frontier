import graph from "../generated/knowledge-graph.json";
import type { KnowledgeGraphData } from "./graph-core.mjs";

export function getKnowledgeGraph(): KnowledgeGraphData {
  return { version: 1, nodes: [...graph.nodes], edges: [...graph.edges] } as KnowledgeGraphData;
}
