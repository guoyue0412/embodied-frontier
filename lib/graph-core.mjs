const graphSections = ["papers", "models", "datasets"];

export function buildKnowledgeGraph(content) {
  const records = graphSections.flatMap((section) => content[section] ?? []);
  const nodes = records.map((record) => ({
    id: `${record.type}:${record.slug}`,
    type: record.type,
    slug: record.slug,
    title: record.title,
    group: record.track ?? record.family ?? record.organization ?? record.type,
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
  return { version: 1, nodes, edges };
}
