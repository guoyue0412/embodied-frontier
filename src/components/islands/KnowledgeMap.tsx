import { useEffect, useMemo, useRef, useState } from "react";
import type cytoscape from "cytoscape";
import type { GraphNode, KnowledgeGraphData } from "../../lib/graph-core.mjs";
import { createKnowledgeGraphStateSynchronizer } from "../../lib/knowledge-graph-runtime.mjs";
import { withBase } from "../../lib/site-path.mjs";
import "../../styles/knowledge-graph.css";

interface Props {
  graph: KnowledgeGraphData;
  basePath: string;
  onError?: (error: unknown) => void;
}

interface GraphViewState {
  visibleIds: ReadonlySet<string>;
  selectedId: string | null;
}

const typeLabels: Record<GraphNode["type"], string> = {
  paper: "论文",
  model: "模型",
  dataset: "数据集",
};

const typePaths: Record<GraphNode["type"], (slug: string) => string> = {
  paper: (slug) => `/papers/${slug}/`,
  model: (slug) => `/models/#model-${slug}`,
  dataset: (slug) => `/datasets/#dataset-${slug}`,
};

function nodeHref(node: GraphNode, basePath: string) {
  return withBase(typePaths[node.type](node.slug), basePath);
}

function slugClass(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function matchesNode(node: GraphNode, query: string, group: string) {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  const searchable = `${node.title} ${node.slug} ${node.type} ${node.group}`.toLocaleLowerCase("zh-CN");
  return (!normalized || searchable.includes(normalized)) && (!group || node.group === group);
}

function applyGraphState(cy: cytoscape.Core, { visibleIds, selectedId }: GraphViewState) {
  cy.nodes().forEach((node) => {
    node.toggleClass("is-filtered", !visibleIds.has(node.id()));
  });
  cy.edges().forEach((edge) => {
    edge.toggleClass("is-filtered", !visibleIds.has(edge.source().id()) || !visibleIds.has(edge.target().id()));
  });

  cy.elements().removeClass("is-selected is-neighbor is-dimmed");
  if (!selectedId) return;
  const focusIds = new Set([selectedId]);
  const selected = cy.getElementById(selectedId);
  if (selected.empty()) return;
  selected.neighborhood("node").forEach((node) => {
    focusIds.add(node.id());
  });
  cy.nodes().forEach((node) => {
    if (node.id() === selectedId) node.addClass("is-selected");
    else if (focusIds.has(node.id())) node.addClass("is-neighbor");
    else node.addClass("is-dimmed");
  });
}

export default function KnowledgeMap({ graph, basePath, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRootRef = useRef<HTMLElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const stateSynchronizerRef = useRef<ReturnType<typeof createKnowledgeGraphStateSynchronizer> | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const groups = useMemo(
    () => [...new Set(graph.nodes.map((node) => node.group))].sort((a, b) => a.localeCompare(b, "zh-CN")),
    [graph.nodes],
  );
  const visibleNodes = useMemo(
    () => graph.nodes.filter((node) => matchesNode(node, query, group)),
    [graph.nodes, group, query],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const selectedNode = graph.nodes.find((node) => node.id === selectedId) ?? null;
  const selectedEdges = selectedId
    ? graph.edges.filter((edge) => edge.source === selectedId || edge.target === selectedId)
    : [];

  useEffect(() => {
    // The map controls are listener-backed once this hydrated island effect runs.
    mapRootRef.current?.setAttribute("data-knowledge-graph-controls-ready", "true");
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    let instance: cytoscape.Core | null = null;
    const synchronizer = createKnowledgeGraphStateSynchronizer((state: GraphViewState) => {
      const cy = cyRef.current;
      if (cy) applyGraphState(cy, state);
    });
    stateSynchronizerRef.current = synchronizer;
    setReady(false);

    async function createGraph() {
      try {
        const module = await import("cytoscape");
        if (cancelled || !containerRef.current) return;
        const createCytoscape = (module.default ?? module) as unknown as typeof cytoscape;
        const positions = Object.fromEntries(graph.nodes.map((node, index) => [
          node.id,
          { x: 120 + (index % 4) * 180, y: 100 + Math.floor(index / 4) * 130 },
        ]));
        instance = createCytoscape({
          container,
          elements: [
            ...graph.nodes.map((node) => ({
              group: "nodes" as const,
              data: { id: node.id, title: node.title, type: node.type, group: node.group },
              classes: `node-${slugClass(node.type)} track-${slugClass(node.group)}`,
            })),
            ...graph.edges.map((edge) => ({
              group: "edges" as const,
              data: { id: edge.id, source: edge.source, target: edge.target, type: edge.type },
            })),
          ],
          style: [
            {
              selector: "node",
              style: {
                label: "data(title)",
                color: "#f3f8ff",
                "font-family": "system-ui, sans-serif",
                "font-size": 11,
                "font-weight": 700,
                "text-wrap": "wrap",
                "text-max-width": "120",
                "text-outline-color": "#07111e",
                "text-outline-width": 3,
                "background-color": "#2fd4e8",
                width: 34,
                height: 34,
                "border-width": 2,
                "border-color": "#c2f8ff",
              },
            },
            { selector: ".node-model", style: { "background-color": "#ffbb65" } },
            { selector: ".node-dataset", style: { "background-color": "#9caec5" } },
            {
              selector: "edge",
              style: {
                width: 1.5,
                "line-color": "#5f7896",
                "target-arrow-color": "#9ab0c8",
                "target-arrow-shape": "triangle",
                "curve-style": "bezier",
                label: "data(type)",
                color: "#d6e6f4",
                "font-size": 9,
                "text-background-color": "#0b1726",
                "text-background-opacity": 0.85,
                "text-background-padding": "2",
              },
            },
            { selector: ".is-dimmed", style: { opacity: 0.18 } },
            { selector: ".is-filtered", style: { display: "none" } },
            { selector: ".is-selected", style: { "border-width": 5, "border-color": "#ffffff", "overlay-color": "#2fd4e8", "overlay-opacity": 0.2 } },
            { selector: ".is-neighbor", style: { opacity: 1, "border-color": "#ffbb65" } },
          ],
          layout: { name: "preset", positions: positions, animate: false, fit: true, padding: 30 },
          minZoom: 0.45,
          maxZoom: 2.5,
        });
        if (cancelled) {
          instance.destroy();
          instance = null;
          return;
        }
        instance.on("tap", "node", (event) => setSelectedId(event.target.id()));
        cyRef.current = instance;
        synchronizer.setReady(true);
        setReady(true);
      } catch (error) {
        if (!cancelled) onError?.(error);
      }
    }

    void createGraph();
    return () => {
      cancelled = true;
      synchronizer.dispose();
      if (stateSynchronizerRef.current === synchronizer) stateSynchronizerRef.current = null;
      cyRef.current = null;
      try {
        instance?.destroy();
      } catch (error) {
        onError?.(error);
      }
    };
  }, [graph, onError]);

  useEffect(() => {
    stateSynchronizerRef.current?.setState({ visibleIds, selectedId });
  }, [selectedId, visibleIds, ready]);

  return (
    <section ref={mapRootRef} className="knowledge-map" aria-labelledby="knowledge-map-title" data-knowledge-graph-controls-ready="false" data-knowledge-map-ready={ready ? "true" : "false"}>
      <div className="knowledge-map__heading">
        <div>
          <span className="eyebrow">INTERACTIVE RELATIONS</span>
          <h2 id="knowledge-map-title">交互图谱</h2>
          <p>节点标签、关系类型和下方节点导航始终可见；点击节点可高亮邻居并回溯关系路径。</p>
        </div>
        <span className="knowledge-map__count" role="status" aria-live="polite">显示 {visibleNodes.length} / {graph.nodes.length} 个节点</span>
      </div>

      <div className="knowledge-map__controls" role="search" aria-label="图谱筛选">
        <label>
          <span>搜索节点</span>
          <input aria-label="搜索节点" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="名称、类型或研究方向" />
        </label>
        <label>
          <span>研究方向分组</span>
          <select aria-label="研究方向分组" value={group} onChange={(event) => setGroup(event.currentTarget.value)}>
            <option value="">全部研究方向</option>
            {groups.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>

      <div className="knowledge-map__workspace">
        <div ref={containerRef} className="knowledge-map__canvas" role="img" aria-label="论文、模型与数据集的关系图谱" />
        <nav className="knowledge-map__nodes" aria-label="图谱节点导航">
          <h3>节点导航</h3>
          <ul>
            {visibleNodes.map((node) => (
              <li key={node.id}>
                <button type="button" data-graph-node={node.id} aria-pressed={selectedId === node.id} onClick={() => setSelectedId(node.id)}>
                  <span>{typeLabels[node.type]}</span>
                  <strong>{node.title}</strong>
                  <small>{node.group}</small>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <aside className="knowledge-map__path" aria-live="polite" aria-labelledby="knowledge-path-title">
        <div className="knowledge-map__path-heading">
          <h3 id="knowledge-path-title">关系路径</h3>
          {selectedNode ? <a href={nodeHref(selectedNode, basePath)}>打开{typeLabels[selectedNode.type]}条目 ↗</a> : <span>选择一个节点查看邻居</span>}
        </div>
        {selectedNode ? (
          <ul>
            {selectedEdges.map((edge) => {
              const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
              const other = graph.nodes.find((node) => node.id === otherId);
              if (!other) return null;
              return (
                <li key={edge.id}>
                  <span>{edge.source === selectedNode.id ? "出" : "入"}</span>
                  <code>{edge.type}</code>
                  <a href={nodeHref(other, basePath)}>{other.title}</a>
                </li>
              );
            })}
          </ul>
        ) : <p>键盘用户可从节点导航选择节点；关系清单仍保留全部边。</p>}
      </aside>
    </section>
  );
}
