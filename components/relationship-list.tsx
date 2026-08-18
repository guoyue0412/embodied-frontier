import type { KnowledgeGraphData } from "@/lib/graph-core.mjs";

const typeLabels = { paper: "论文", model: "模型", dataset: "数据集" };

export function RelationshipList({ graph }: { graph: KnowledgeGraphData }) {
  const titles = new Map(graph.nodes.map((node) => [node.id, node.title]));
  return (
    <section className="relationship-section" aria-labelledby="relationship-title">
      <div className="group-heading"><h2 id="relationship-title">关系清单</h2><span>{graph.edges.length} EDGES</span></div>
      <p className="relationship-note">这是关系图的完整键盘与无 JavaScript 等价视图；每条边都来自 Markdown 中显式声明的 relations 字段。</p>
      <div className="relationship-list">
        {graph.nodes.map((node) => {
          const outbound = graph.edges.filter((edge) => edge.source === node.id);
          const inbound = graph.edges.filter((edge) => edge.target === node.id);
          if (!outbound.length && !inbound.length) return null;
          return <details key={node.id}><summary><span>{typeLabels[node.type]}</span><strong>{node.title}</strong><small>{outbound.length + inbound.length} 条关系</small></summary><ul>
            {outbound.map((edge) => <li key={edge.id}><b>{node.title}</b><code>{edge.type}</code><span>{titles.get(edge.target)}</span></li>)}
            {inbound.map((edge) => <li key={`in-${edge.id}`}><span>{titles.get(edge.source)}</span><code>{edge.type}</code><b>{node.title}</b></li>)}
          </ul></details>;
        })}
      </div>
    </section>
  );
}
