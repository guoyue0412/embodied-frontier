const graphSections = ["papers", "models", "datasets"];

function clusterSlug(value) {
  return String(value).toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unassigned";
}

function fallbackTrack(type) {
  return { paper: "Unassigned research", model: "Unassigned model", dataset: "Unassigned data" }[type] ?? "Unassigned";
}

export function buildKnowledgeGraph(content) {
  const records = graphSections.flatMap((section) => content[section] ?? []);
  const nodes = records.map((record) => ({
    id: `${record.type}:${record.slug}`,
    type: record.type,
    slug: record.slug,
    title: record.title,
    group: record.track ?? record.researchTrack ?? record.family ?? null,
  })).sort((a, b) => a.id.localeCompare(b.id));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = [];
  for (const record of records) {
    const source = `${record.type}:${record.slug}`;
    for (const relation of record.relations ?? []) {
      if (!nodeIds.has(relation.target)) throw new Error(`${source} has dangling relation target ${relation.target}`);
      edges.push({ id: `${source}|${relation.type}|${relation.target}`, source, target: relation.target, type: relation.type });
    }
  }
  edges.sort((a, b) => a.id.localeCompare(b.id));

  const neighbors = new Map(nodes.map((node) => [node.id, new Set()]));
  for (const edge of edges) {
    neighbors.get(edge.source)?.add(edge.target);
    neighbors.get(edge.target)?.add(edge.source);
  }
  const tracks = new Map(nodes.map((node) => [node.id, node.group]));
  for (const node of nodes) {
    if (!tracks.get(node.id)) tracks.set(node.id, null);
  }
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;
    for (const node of nodes) {
      if (tracks.get(node.id)) continue;
      const inherited = [...(neighbors.get(node.id) ?? [])]
        .map((neighbor) => tracks.get(neighbor))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "zh-CN"))[0];
      if (inherited) {
        tracks.set(node.id, inherited);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const node of nodes) tracks.set(node.id, tracks.get(node.id) ?? fallbackTrack(node.type));
  for (const node of nodes) {
    node.group = tracks.get(node.id);
    node.clusterId = `track:${clusterSlug(node.group)}`;
  }

  const clusterGroups = new Map();
  for (const node of nodes) {
    if (!clusterGroups.has(node.clusterId)) clusterGroups.set(node.clusterId, { id: node.clusterId, label: node.group, nodeIds: [] });
    clusterGroups.get(node.clusterId).nodeIds.push(node.id);
  }
  const clusters = [...clusterGroups.values()].sort((a, b) => a.id.localeCompare(b.id));
  const positions = {};
  clusters.forEach((cluster, clusterIndex) => {
    const columns = Math.min(4, Math.max(1, cluster.nodeIds.length));
    cluster.nodeIds.forEach((nodeId, index) => {
      positions[nodeId] = {
        x: 120 + (index % columns) * 160,
        y: 100 + clusterIndex * 190 + Math.floor(index / columns) * 130,
      };
    });
    cluster.region = {
      x: 120 + ((columns - 1) * 160) / 2,
      y: 100 + clusterIndex * 190 + (Math.ceil(cluster.nodeIds.length / columns) - 1) * 65,
      width: Math.max(260, columns * 160),
      height: Math.max(150, Math.ceil(cluster.nodeIds.length / columns) * 130),
    };
  });
  return { version: 1, nodes, edges, clusters, positions };
}
