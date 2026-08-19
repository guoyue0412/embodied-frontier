import assert from "node:assert/strict";
import test from "node:test";
import {
  createAnimationLifecycle,
  createFailureGate,
  bindScopedInteraction,
  resolveInteractionTarget,
} from "../src/lib/hero-visual-runtime.mjs";

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
    flush() {
      const current = [...callbacks.entries()];
      callbacks.clear();
      for (const [, callback] of current) callback();
    },
    pending() {
      return callbacks.size;
    },
    cancelled,
  };
}

test("animation lifecycle schedules only while intersecting and document-visible", () => {
  const raf = fakeRaf();
  let frames = 0;
  const lifecycle = createAnimationLifecycle({
    requestFrame: raf.requestFrame,
    cancelFrame: raf.cancelFrame,
    onFrame: () => frames++,
  });

  lifecycle.start();
  assert.equal(raf.pending(), 0);
  lifecycle.setIntersecting(true);
  assert.equal(raf.pending(), 1);
  raf.flush();
  assert.equal(frames, 1);
  assert.equal(raf.pending(), 1);

  lifecycle.setDocumentVisible(false);
  assert.equal(raf.pending(), 0);
  raf.flush();
  assert.equal(frames, 1);

  lifecycle.setDocumentVisible(true);
  assert.equal(raf.pending(), 1);
  raf.flush();
  assert.equal(frames, 2);

  lifecycle.setIntersecting(false);
  assert.equal(raf.pending(), 0);
  lifecycle.dispose();
  lifecycle.setIntersecting(true);
  assert.equal(raf.pending(), 0);
  assert.ok(raf.cancelled.length >= 2);
});

test("failure gate reports one deterministic enhancement failure", () => {
  const errors = [];
  const gate = createFailureGate((error) => errors.push(error));
  const first = new Error("no webgl");
  const second = new Error("texture failed");

  gate.fail(first);
  gate.fail(second);

  assert.equal(gate.failed, true);
  assert.deepEqual(errors, [first]);
});

test("interaction target resolves to the nearest static hero ancestor", () => {
  const hero = { nodeType: 1 };
  const island = {
    closest(selector) {
      return selector === "[data-static-hero]" ? hero : null;
    },
  };

  assert.equal(resolveInteractionTarget(island), hero);
  assert.equal(resolveInteractionTarget(null), null);
});

test("scoped interaction bindings attach and detach on the hero target", () => {
  const added = [];
  const removed = [];
  const hero = {
    addEventListener(...args) {
      added.push(args);
    },
    removeEventListener(...args) {
      removed.push(args);
    },
  };
  const island = { closest: () => hero };
  const move = () => {};
  const click = () => {};
  const cleanup = bindScopedInteraction(island, [
    { type: "mousemove", listener: move, options: { passive: true } },
    { type: "click", listener: click },
  ]);

  assert.deepEqual(added.map(([type, listener]) => [type, listener]), [["mousemove", move], ["click", click]]);
  cleanup();
  assert.deepEqual(removed.map(([type, listener]) => [type, listener]), [["mousemove", move], ["click", click]]);
});
