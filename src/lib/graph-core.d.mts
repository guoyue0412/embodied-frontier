export interface GraphNode { id: string; type: "paper" | "model" | "dataset"; slug: string; title: string; group: string }
export interface GraphEdge { id: string; source: string; target: string; type: string }
export interface KnowledgeGraphData { version: 1; nodes: GraphNode[]; edges: GraphEdge[] }
export function buildKnowledgeGraph(content: Record<string, Array<Record<string, unknown>>>): KnowledgeGraphData;
