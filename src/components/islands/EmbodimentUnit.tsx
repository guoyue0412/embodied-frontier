import { useEffect, useRef, useState } from "react";
import { createEmbodimentFailureGate } from "../../lib/embodiment-runtime.mjs";
import { withBase } from "../../lib/site-path.mjs";
import "../../styles/embodiment-unit.css";

interface EmbodimentUnitProps {
  imageSrc?: string;
}

interface EmbodimentScene {
  setPointer(x: number, y: number): void;
  setVisible(value: boolean): void;
  resize(): void;
  dispose(): void;
}

interface EmbodimentSceneModule {
  createEmbodimentScene: (canvas: HTMLCanvasElement, options?: { onError?: (error: unknown) => void }) => EmbodimentScene;
}

function StaticEmbodimentFallback({ imageSrc }: { imageSrc: string }) {
  const source = withBase(imageSrc);
  return (
    <div className="embodiment-unit__fallback" data-embodiment-fallback="true">
      <picture>
        <source srcSet={source} type="image/webp" />
        <img src={source} alt="" aria-hidden="true" />
      </picture>
      <span className="embodiment-unit__fallback-mark" aria-hidden="true">PROCEDURAL UNIT / STATIC VIEW</span>
    </div>
  );
}

function readEligibleCapabilities() {
  return {
    eligible: window.matchMedia("(min-width: 768px) and (pointer: fine)").matches,
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

export default function EmbodimentUnit({ imageSrc = "/hero-static.webp" }: EmbodimentUnitProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<EmbodimentScene | null>(null);
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return undefined;

    let disposed = false;
    let intersecting = false;
    let loading = false;
    let terminalFailure = false;
    let observer: IntersectionObserver | null = null;
    let lifecycleCleaned = false;
    let pointer = { x: 0, y: 0 };
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopQuery = window.matchMedia("(min-width: 768px) and (pointer: fine)");
    const pointerTarget = root.closest("[data-static-hero]") ?? root;

    if (typeof IntersectionObserver === "undefined") {
      // The picture is already the visible layer; an unsupported observer
      // simply leaves the canvas dormant without touching the fallback.
      return undefined;
    }

    const stopScene = () => {
      const scene = sceneRef.current;
      sceneRef.current = null;
      try {
        scene?.dispose();
      } catch {
        // A context-loss/unmount race must not prevent lifecycle listeners
        // from being removed or the static fallback from taking over.
      }
      if (!disposed) setActive(false);
    };
    const removeLifecycleBindings = () => {
      if (lifecycleCleaned) return;
      lifecycleCleaned = true;
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      reducedQuery.removeEventListener?.("change", onCapabilityChange);
      desktopQuery.removeEventListener?.("change", onCapabilityChange);
      pointerTarget.removeEventListener("pointermove", onPointerMove);
      pointerTarget.removeEventListener("pointerleave", onPointerLeave);
    };
    const failureGate = createEmbodimentFailureGate({
      cleanup: () => {
        terminalFailure = true;
        stopScene();
        removeLifecycleBindings();
      },
      onFallback: (error) => {
        if (disposed) return;
        console.warn("[EmbodimentUnit] optional WebGL enhancement disabled; static fallback remains active.", error);
        setFailed(true);
      },
    });
    const failScene = (error: unknown) => {
      if (disposed || terminalFailure || failureGate.failed) return;
      failureGate.fail(error);
    };
    const syncVisibility = () => {
      if (disposed || terminalFailure) return;
      sceneRef.current?.setVisible(intersecting && !document.hidden);
    };
    const startScene = async () => {
      const capabilities = readEligibleCapabilities();
      if (disposed || terminalFailure || failureGate.failed || loading || sceneRef.current || !intersecting || !capabilities.eligible || capabilities.reduced) return;
      loading = true;
      try {
        // Keep Three.js behind both the desktop capability and viewport intent
        // gate. Touch/narrow/reduced-motion sessions never evaluate this import.
        const module = (await import("../../lib/three/create-embodiment-scene")) as EmbodimentSceneModule;
        if (disposed || terminalFailure || failureGate.failed || !intersecting || !desktopQuery.matches || reducedQuery.matches) return;
        const scene = module.createEmbodimentScene(canvas, { onError: failScene });
        if (disposed || terminalFailure || failureGate.failed) {
          try {
            scene.dispose();
          } catch {
            // The failure gate already owns fallback state; keep late init
            // cleanup from escaping if the renderer is already lost.
          }
          return;
        }
        sceneRef.current = scene;
        scene.setPointer(pointer.x, pointer.y);
        scene.setVisible(!document.hidden && intersecting);
        if (!disposed && !terminalFailure) setActive(true);
      } catch (error) {
        failScene(error);
      } finally {
        loading = false;
      }
    };
    const onIntersect = (entries: IntersectionObserverEntry[]) => {
      if (disposed || terminalFailure) return;
      intersecting = entries.some((entry) => entry.isIntersecting);
      syncVisibility();
      if (intersecting) void startScene();
    };
    observer = new IntersectionObserver(onIntersect, { threshold: 0.12 });
    observer.observe(root);

    const onVisibility = () => syncVisibility();
    const onResize = () => {
      if (disposed || terminalFailure) return;
      if (!desktopQuery.matches || reducedQuery.matches) {
        stopScene();
        return;
      }
      try {
        sceneRef.current?.resize();
      } catch (error) {
        failScene(error);
        return;
      }
      if (intersecting) void startScene();
    };
    const onCapabilityChange = () => {
      if (disposed || terminalFailure) return;
      const capabilities = readEligibleCapabilities();
      if (!capabilities.eligible || capabilities.reduced) {
        stopScene();
        return;
      }
      if (intersecting) void startScene();
    };
    const onPointerMove = (event: Event) => {
      if (disposed || terminalFailure) return;
      const pointerEvent = event as PointerEvent;
      const bounds = pointerTarget.getBoundingClientRect();
      pointer = {
        x: bounds.width ? (pointerEvent.clientX - bounds.left) / bounds.width * 2 - 1 : 0,
        y: bounds.height ? -((pointerEvent.clientY - bounds.top) / bounds.height * 2 - 1) : 0,
      };
      sceneRef.current?.setPointer(pointer.x, pointer.y);
    };
    const onPointerLeave = () => {
      if (disposed || terminalFailure) return;
      pointer = { x: 0, y: 0 };
      sceneRef.current?.setPointer(0, 0);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize, { passive: true });
    reducedQuery.addEventListener?.("change", onCapabilityChange);
    desktopQuery.addEventListener?.("change", onCapabilityChange);
    pointerTarget.addEventListener("pointermove", onPointerMove, { passive: true });
    pointerTarget.addEventListener("pointerleave", onPointerLeave, { passive: true });

    return () => {
      disposed = true;
      removeLifecycleBindings();
      stopScene();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="embodiment-unit"
      data-embodiment-unit="true"
      data-embodiment-active={active && !failed ? "true" : "false"}
      data-embodiment-state={active && !failed ? "ready" : failed ? "fallback-error" : "fallback"}
      data-embodiment-failure={failed ? "true" : "false"}
      aria-hidden="true"
    >
      <StaticEmbodimentFallback imageSrc={imageSrc} />
      {!failed && <canvas ref={canvasRef} className="embodiment-unit__canvas" aria-hidden="true" />}
    </div>
  );
}
