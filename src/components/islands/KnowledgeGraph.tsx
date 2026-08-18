import { useCallback, useState, type ComponentType } from "react";
import type { KnowledgeGraphData } from "../../lib/graph-core.mjs";
import "../../styles/knowledge-graph.css";

export interface KnowledgeMapProps {
  graph: KnowledgeGraphData;
  onError?: (error: unknown) => void;
}

type GraphState = "idle" | "loading" | "ready" | "error";

export default function KnowledgeGraph({ graph }: { graph: KnowledgeGraphData }) {
  const [state, setState] = useState<GraphState>("idle");
  const [KnowledgeMap, setKnowledgeMap] = useState<ComponentType<KnowledgeMapProps> | null>(null);

  const handleError = useCallback((error: unknown) => {
    console.warn("[KnowledgeGraph] optional Cytoscape enhancement disabled; relationship list remains available.", error);
    setKnowledgeMap(null);
    setState("error");
  }, []);

  const loadGraph = useCallback(async () => {
    if (state === "loading" || state === "ready") return;
    setState("loading");
    try {
      // The map island is a second boundary: loading this shell never fetches
      // Cytoscape, and the map only imports it after this explicit request.
      const module = await import("./KnowledgeMap");
      setKnowledgeMap(() => module.default);
      setState("ready");
    } catch (error) {
      handleError(error);
    }
  }, [handleError, state]);

  if (state === "ready" && KnowledgeMap) {
    return <KnowledgeMap graph={graph} onError={handleError} />;
  }

  const buttonLabel = state === "error" ? "重试加载交互图谱" : "加载交互图谱";
  return (
    <section
      className="graph-loader knowledge-graph"
      aria-labelledby="graph-visual-title"
      data-knowledge-graph-state={state}
      aria-busy={state === "loading" ? "true" : "false"}
    >
      <div className="knowledge-graph__intro">
        <span className="eyebrow">OPTIONAL VISUAL LAYER</span>
        <h2 id="graph-visual-title">轻量关系图</h2>
        <p>默认只呈现完整关系清单；按需加载交互图谱，Cytoscape 不会在页面初始加载。</p>
        {state === "error" && (
          <p className="knowledge-graph__error" role="alert">
            交互图谱暂时不可用，下面的完整关系清单仍可键盘访问。
          </p>
        )}
      </div>
      <button className="button button--primary knowledge-graph__load" type="button" onClick={() => void loadGraph()} disabled={state === "loading"}>
        {state === "loading" ? "正在加载交互图谱…" : buttonLabel}
        <span className="knowledge-graph__legacy-label" aria-hidden="true">加载关系图</span>
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
