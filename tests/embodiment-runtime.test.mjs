import test from "node:test";
import assert from "node:assert/strict";
import { createEmbodimentFailureGate, createEmbodimentRenderLoop } from "../src/lib/embodiment-runtime.mjs";

function fakeRaf() {
  let nextId = 1;
  const callbacks = new Map();
  const cancelled = [];
  return {
    requestFrame(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelFrame(id) {
      cancelled.push(id);
      callbacks.delete(id);
    },
    flush(timestamp = 16) {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(timestamp));
    },
    pending() {
      return callbacks.size;
    },
    cancelled,
  };
}

test("failure gate is terminal, cleans up once, and prevents retry", () => {
  const first = new Error("webgl init failed");
  const second = new Error("retry must not happen");
  const cleanup = [];
  const fallback = [];
  const gate = createEmbodimentFailureGate({
    cleanup: () => cleanup.push("cleanup"),
    onFallback: (error) => fallback.push(error),
  });

  assert.equal(gate.failed, false);
  assert.equal(gate.fail(first), true);
  assert.equal(gate.fail(second), false);
  assert.equal(gate.failed, true);
  assert.deepEqual(cleanup, ["cleanup"]);
  assert.deepEqual(fallback, [first]);

  const safeGate = createEmbodimentFailureGate({
    cleanup: () => {
      throw new Error("cleanup raced unmount");
    },
    onFallback: (error) => fallback.push(error),
  });
  assert.equal(safeGate.fail(first), true);
  assert.deepEqual(fallback, [first, first]);
});

test("render errors report once and cancel the pending RAF", () => {
  const raf = fakeRaf();
  const first = new Error("renderer exploded");
  const errors = [];
  const fallback = [];
  const gate = createEmbodimentFailureGate({
    onFallback: (error) => fallback.push(error),
  });
  let frames = 0;
  const loop = createEmbodimentRenderLoop({
    requestFrame: raf.requestFrame,
    cancelFrame: raf.cancelFrame,
    shouldRender: () => true,
    onFrame: () => {
      frames += 1;
      throw first;
    },
    onError: (error) => {
      errors.push(error);
      gate.fail(error);
    },
  });

  loop.schedule();
  assert.equal(raf.pending(), 1);
  raf.flush();
  assert.equal(frames, 1);
  assert.equal(loop.failed, true);
  assert.equal(raf.pending(), 0);
  assert.deepEqual(errors, [first]);
  assert.deepEqual(fallback, [first]);

  loop.schedule();
  raf.flush();
  assert.equal(frames, 1);
  assert.deepEqual(errors, [first]);
  assert.equal(loop.running, false);

  const pendingLoop = createEmbodimentRenderLoop({
    requestFrame: raf.requestFrame,
    cancelFrame: raf.cancelFrame,
    shouldRender: () => true,
    onFrame: () => {},
  });
  pendingLoop.schedule();
  assert.equal(raf.pending(), 1);
  pendingLoop.dispose();
  assert.equal(pendingLoop.running, false);
  assert.equal(raf.pending(), 0);
  assert.equal(raf.cancelled.length, 1);
  loop.dispose();
});
