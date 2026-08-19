export interface GraphNode { id: string; type: "paper" | "model" | "dataset"; slug: string; title: string; group: string; clusterId: string }
export interface GraphEdge { id: string; source: string; target: string; type: string }
export interface GraphCluster { id: string; label: string; nodeIds: string[]; region: { x: number; y: number; width: number; height: number } }
export interface KnowledgeGraphData { version: 1; nodes: GraphNode[]; edges: GraphEdge[]; clusters: GraphCluster[]; positions: Record<string, { x: number; y: number }> }
export function buildKnowledgeGraph(content: Record<string, Array<Record<string, unknown>>>): KnowledgeGraphData;
