export function validateRelations(nodes) {
  const ids = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    for (const relation of node.relations ?? []) {
      if (!ids.has(relation.target)) throw new Error(`${node.id} references missing relation ${relation.target}`);
    }
  }
  return true;
}
