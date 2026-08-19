/**
 * A one-shot host failure boundary for optional visual enhancements.
 * Cleanup happens before the host switches to its static fallback so a
 * detached canvas cannot be reached by a late observer or media callback.
 */
/** @param {{ cleanup?: () => void, onFallback?: (error: unknown) => void }} [options] */
export function createEmbodimentFailureGate({ cleanup = () => {}, onFallback = () => {} } = {}) {
  let failed = false;
  return {
    get failed() {
      return failed;
    },
    fail(error) {
      if (failed) return false;
      failed = true;
      try {
        cleanup();
      } catch {
        // Optional enhancement cleanup must not block the static fallback.
      }
      try {
        onFallback(error);
      } catch {
        // A host callback can race an unmount; keep the failure terminal.
      }
      return true;
    },
  };
}

/**
 * RAF lifecycle used by the procedural scene. A thrown renderer call is a
 * terminal loop failure: no new frame is scheduled and the host is notified
 * exactly once. The helper accepts browser-independent frame functions so the
 * failure contract can be tested without a graphics-capable browser.
 */
/** @param {{ requestFrame: (callback: (timestamp: number) => void) => number, cancelFrame: (id: number) => void, shouldRender?: () => boolean, onFrame: (timestamp: number) => void, onError?: (error: unknown) => void }} options */
export function createEmbodimentRenderLoop({
  requestFrame,
  cancelFrame,
  shouldRender = () => true,
  onFrame,
  onError = () => {},
}) {
  let disposed = false;
  let failed = false;
  let frameId = null;

  const stop = () => {
    if (frameId === null) return;
    cancelFrame(frameId);
    frameId = null;
  };
  const frame = (timestamp) => {
    frameId = null;
    if (disposed || failed || !shouldRender()) return;
    try {
      onFrame(timestamp);
    } catch (error) {
      failed = true;
      stop();
      try {
        onError(error);
      } catch {
        // A host failure callback must not turn an optional enhancement into
        // an uncaught browser error during unmount or context-loss races.
      }
      return;
    }
    if (!disposed && !failed && shouldRender()) schedule();
  };
  const schedule = () => {
    if (disposed || failed || frameId !== null || !shouldRender()) return;
    frameId = requestFrame(frame);
  };

  return {
    schedule,
    stop,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
    },
    get running() {
      return frameId !== null;
    },
    get failed() {
      return failed;
    },
  };
}
