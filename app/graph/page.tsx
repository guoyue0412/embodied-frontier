import type { Metadata } from "next";
import { KnowledgeGraph } from "@/components/knowledge-graph";
import { RelationshipList } from "@/components/relationship-list";
import { getKnowledgeGraph } from "@/lib/graph";

export const metadata: Metadata = { title: "知识图谱", description: "浏览论文、模型与数据集之间由 Markdown 显式声明的关系。" };

export default function GraphPage() {
  const graph = getKnowledgeGraph();
  return <main id="main-content"><header className="page-intro page-shell"><span className="eyebrow">KNOWLEDGE RELATIONS</span><h1>从孤立条目，<br />回到研究关系。</h1><p>{graph.nodes.length} 个节点、{graph.edges.length} 条显式关系；拒绝从关键词共现自动臆测连接。</p></header><div className="page-section page-shell"><KnowledgeGraph graph={graph} /><RelationshipList graph={graph} /></div></main>;
}
