/**
 * Buffer the latest graph view state until the optional Cytoscape instance is
 * ready. This keeps async chunk loading from losing filter or selection
 * changes made while the fallback shell is transitioning.
 */
export function createKnowledgeGraphStateSynchronizer(apply) {
  let ready = false;
  let disposed = false;
  let latestState;

  return {
    setState(state) {
      if (disposed) return;
      latestState = state;
      if (ready) apply(state);
    },
    setReady(value) {
      if (disposed) return;
      ready = Boolean(value);
      if (ready && latestState) apply(latestState);
    },
    dispose() {
      disposed = true;
      ready = false;
      latestState = undefined;
    },
  };
}
