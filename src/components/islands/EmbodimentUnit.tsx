import { useEffect, useRef, useState } from "react";
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
  createEmbodimentScene: (canvas: HTMLCanvasElement) => EmbodimentScene;
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
      sceneRef.current?.dispose();
      sceneRef.current = null;
      if (!disposed) setActive(false);
    };
    const failScene = (error: unknown) => {
      if (disposed) return;
      console.warn("[EmbodimentUnit] optional WebGL enhancement disabled; static fallback remains active.", error);
      stopScene();
      setFailed(true);
    };
    const syncVisibility = () => {
      sceneRef.current?.setVisible(intersecting && !document.hidden);
    };
    const startScene = async () => {
      const capabilities = readEligibleCapabilities();
      if (disposed || loading || sceneRef.current || !intersecting || !capabilities.eligible || capabilities.reduced) return;
      loading = true;
      try {
        // Keep Three.js behind both the desktop capability and viewport intent
        // gate. Touch/narrow/reduced-motion sessions never evaluate this import.
        const module = (await import("../../lib/three/create-embodiment-scene")) as EmbodimentSceneModule;
        if (disposed || !intersecting || !desktopQuery.matches || reducedQuery.matches) return;
        const scene = module.createEmbodimentScene(canvas);
        sceneRef.current = scene;
        scene.setPointer(pointer.x, pointer.y);
        scene.setVisible(!document.hidden && intersecting);
        if (!disposed) setActive(true);
      } catch (error) {
        failScene(error);
      } finally {
        loading = false;
      }
    };
    const onIntersect = (entries: IntersectionObserverEntry[]) => {
      intersecting = entries.some((entry) => entry.isIntersecting);
      syncVisibility();
      if (intersecting) void startScene();
    };
    const observer = new IntersectionObserver(onIntersect, { threshold: 0.12 });
    observer.observe(root);

    const onVisibility = () => syncVisibility();
    const onResize = () => {
      if (!desktopQuery.matches || reducedQuery.matches) {
        stopScene();
        return;
      }
      sceneRef.current?.resize();
      if (intersecting) void startScene();
    };
    const onCapabilityChange = () => {
      const capabilities = readEligibleCapabilities();
      if (!capabilities.eligible || capabilities.reduced) {
        stopScene();
        return;
      }
      if (intersecting) void startScene();
    };
    const onPointerMove = (event: Event) => {
      const pointerEvent = event as PointerEvent;
      const bounds = pointerTarget.getBoundingClientRect();
      pointer = {
        x: bounds.width ? (pointerEvent.clientX - bounds.left) / bounds.width * 2 - 1 : 0,
        y: bounds.height ? -((pointerEvent.clientY - bounds.top) / bounds.height * 2 - 1) : 0,
      };
      sceneRef.current?.setPointer(pointer.x, pointer.y);
    };
    const onPointerLeave = () => {
      pointer = { x: 0, y: 0 };
      sceneRef.current?.setPointer(0, 0);
    };
    const onContextLost = () => failScene(new Error("WebGL context lost"));

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize, { passive: true });
    reducedQuery.addEventListener?.("change", onCapabilityChange);
    desktopQuery.addEventListener?.("change", onCapabilityChange);
    pointerTarget.addEventListener("pointermove", onPointerMove, { passive: true });
    pointerTarget.addEventListener("pointerleave", onPointerLeave, { passive: true });
    canvas.addEventListener("embodiment-context-lost", onContextLost);

    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      reducedQuery.removeEventListener?.("change", onCapabilityChange);
      desktopQuery.removeEventListener?.("change", onCapabilityChange);
      pointerTarget.removeEventListener("pointermove", onPointerMove);
      pointerTarget.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("embodiment-context-lost", onContextLost);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="embodiment-unit"
      data-embodiment-unit="true"
      data-embodiment-active={active && !failed ? "true" : "false"}
      aria-hidden="true"
    >
      <StaticEmbodimentFallback imageSrc={imageSrc} />
      {!failed && <canvas ref={canvasRef} className="embodiment-unit__canvas" aria-hidden="true" />}
    </div>
  );
}
