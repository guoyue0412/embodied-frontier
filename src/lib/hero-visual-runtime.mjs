/**
 * Small browser-independent lifecycle primitives shared by the optional hero
 * effects. Keeping these transitions separate makes visibility behavior
 * deterministic and testable without requiring a graphics-capable browser.
 */
/**
 * @param {{ requestFrame: (callback: (timestamp: number) => void) => number, cancelFrame: (id: number) => void, onFrame: () => void, onActiveChange?: (active: boolean) => void }} options
 */
export function createAnimationLifecycle({ requestFrame, cancelFrame, onFrame, onActiveChange }) {
  let disposed = false;
  let started = false;
  let intersecting = false;
  let documentVisible = true;
  let frameId = null;
  let lastActive = false;

  const active = () => started && !disposed && intersecting && documentVisible;
  const stopFrame = () => {
    if (frameId !== null) {
      cancelFrame(frameId);
      frameId = null;
    }
  };
  const schedule = () => {
    if (!active() || frameId !== null) return;
    frameId = requestFrame(() => {
      frameId = null;
      if (!active()) return;
      onFrame();
      schedule();
    });
  };
  const sync = () => {
    const nextActive = active();
    if (nextActive !== lastActive) {
      lastActive = nextActive;
      onActiveChange?.(nextActive);
    }
    if (nextActive) schedule();
    else stopFrame();
  };

  return {
    start() {
      started = true;
      sync();
    },
    stop() {
      started = false;
      sync();
    },
    setIntersecting(value) {
      intersecting = value;
      sync();
    },
    setDocumentVisible(value) {
      documentVisible = value;
      sync();
    },
    dispose() {
      disposed = true;
      started = false;
      sync();
    },
    get active() {
      return active();
    },
    get running() {
      return frameId !== null;
    },
  };
}

/** @param {(error: unknown) => void} [onFailure] */
export function createFailureGate(onFailure = () => {}) {
  let failed = false;
  return {
    get failed() {
      return failed;
    },
    fail(error) {
      if (failed) return false;
      failed = true;
      onFailure(error);
      return true;
    },
  };
}

export function resolveInteractionTarget(node) {
  if (!node) return null;
  return node.closest?.("[data-static-hero]") ?? node;
}

/**
 * @param {unknown} node
 * @param {Array<{ type: string, listener: EventListener, options?: AddEventListenerOptions }>} bindings
 */
export function bindScopedInteraction(node, bindings) {
  const target = resolveInteractionTarget(node);
  if (!target?.addEventListener) return () => {};
  for (const { type, listener, options } of bindings) target.addEventListener(type, listener, options);
  return () => {
    for (const { type, listener, options } of bindings) target.removeEventListener(type, listener, options);
  };
}
