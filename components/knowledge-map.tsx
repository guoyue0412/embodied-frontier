"use client";

import { useState } from "react";
import type { KnowledgeGraphData } from "@/lib/graph-core.mjs";

export default function KnowledgeMap({ graph }: { graph: KnowledgeGraphData }) {
  const [selected, setSelected] = useState(graph.nodes[0]?.id ?? "");
  const relatedIds = new Set(graph.edges.flatMap((edge) => edge.source === selected ? [edge.target] : edge.target === selected ? [edge.source] : []));
  const selectedNode = graph.nodes.find((node) => node.id === selected);
  return <div className="knowledge-map" aria-label="交互式知识关系图">
    <div className="knowledge-map__nodes" role="list" aria-label="知识节点">
      {graph.nodes.map((node) => <div role="listitem" key={node.id}><button type="button" className={`graph-node graph-node--${node.type}${node.id === selected ? " is-selected" : ""}${relatedIds.has(node.id) ? " is-related" : ""}`} aria-pressed={node.id === selected} onClick={() => setSelected(node.id)}><small>{node.type.toUpperCase()}</small><strong>{node.title}</strong></button></div>)}
    </div>
    <div className="knowledge-map__selection" role="status" aria-live="polite"><span>SELECTED</span><strong>{selectedNode?.title}</strong><p>{relatedIds.size} 个直接关联节点。使用 Tab 选择节点，完整边列表见下方关系清单。</p></div>
  </div>;
}
