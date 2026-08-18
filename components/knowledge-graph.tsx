"use client";

import { lazy, Suspense, useState } from "react";
import type { KnowledgeGraphData } from "@/lib/graph-core.mjs";

const KnowledgeMap = lazy(() => import("@/components/knowledge-map"));

export function KnowledgeGraph({ graph }: { graph: KnowledgeGraphData }) {
  const [loaded, setLoaded] = useState(false);
  return <section className="graph-loader" aria-labelledby="graph-visual-title"><div><span className="eyebrow">OPTIONAL VISUAL LAYER</span><h2 id="graph-visual-title">轻量关系图</h2><p>默认不加载可视层，完整知识关系已在下方清单中呈现。</p></div>{loaded ? <Suspense fallback={<p>正在加载关系图…</p>}><KnowledgeMap graph={graph} /></Suspense> : <button className="button button--primary" type="button" onClick={() => setLoaded(true)}>加载关系图 <span aria-hidden="true">→</span></button>}</section>;
}
