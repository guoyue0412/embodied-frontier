import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { computeAtlasPositions, nextAtlasIndex } from "../../lib/atlas-navigator.mjs";

interface AtlasDestination {
  code: string;
  label: string;
  description: string;
  href: string;
}

interface AtlasNavigatorProps {
  destinations: AtlasDestination[];
}

type AtlasStyle = CSSProperties & Record<`--atlas-${string}`, string>;

const ORBIT_RADIUS = 148;
const STATIC_CAPABILITY_QUERY = "(max-width: 767px), (pointer: coarse)";

function positionStyle(x: number, y: number): AtlasStyle {
  return {
    "--atlas-x": `${x}px`,
    "--atlas-y": `${y}px`,
  };
}

export default function AtlasNavigator({ destinations }: AtlasNavigatorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const activeRef = useRef(0);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);
  const documentHiddenRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const staticCapabilityRef = useRef(false);
  const animationSyncRef = useRef<(() => void) | null>(null);
  const frameRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [staticCapability, setStaticCapability] = useState(false);
  const positions = useMemo(() => computeAtlasPositions(destinations.length, ORBIT_RADIUS), [destinations.length]);
  const activeDestination = destinations[activeIndex] ?? destinations[0];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    setHydrated(true);
    const motionQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    const staticCapabilityQuery = typeof window.matchMedia === "function"
      ? window.matchMedia(STATIC_CAPABILITY_QUERY)
      : null;
    reducedMotionRef.current = motionQuery?.matches ?? false;
    staticCapabilityRef.current = staticCapabilityQuery?.matches ?? false;
    documentHiddenRef.current = document.hidden;
    setReducedMotion(reducedMotionRef.current);
    setStaticCapability(staticCapabilityRef.current);

    const stopAnimation = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastFrameRef.current = null;
    };

    const tick = (timestamp: number) => {
      frameRef.current = null;
      if (pausedRef.current || !visibleRef.current || documentHiddenRef.current || reducedMotionRef.current || staticCapabilityRef.current) return;

      const previous = lastFrameRef.current ?? timestamp;
      const delta = Math.min(timestamp - previous, 64);
      lastFrameRef.current = timestamp;
      phaseRef.current = (phaseRef.current + delta * 0.003) % 360;
      root.style.setProperty("--atlas-phase", `${phaseRef.current}deg`);
      frameRef.current = window.requestAnimationFrame(tick);
    };

    const syncAnimation = () => {
      const staticMode = staticCapabilityRef.current || reducedMotionRef.current;
      const shouldSuspend = !visibleRef.current || documentHiddenRef.current;
      const shouldStop = staticMode || pausedRef.current || shouldSuspend;
      setSuspended(shouldSuspend);
      root.dataset.atlasNavigatorSuspended = shouldSuspend ? "true" : "false";
      root.dataset.atlasNavigatorMode = staticMode
        ? "static"
        : pausedRef.current
          ? "paused"
          : shouldSuspend
            ? "suspended"
            : "orbit";

      if (shouldStop) {
        stopAnimation();
      } else if (frameRef.current === null) {
        lastFrameRef.current = null;
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };

    animationSyncRef.current = syncAnimation;

    const onDocumentVisibility = () => {
      documentHiddenRef.current = document.hidden;
      syncAnimation();
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
      setReducedMotion(event.matches);
      syncAnimation();
    };

    const onStaticCapabilityChange = (event: MediaQueryListEvent) => {
      staticCapabilityRef.current = event.matches;
      setStaticCapability(event.matches);
      syncAnimation();
    };

    document.addEventListener("visibilitychange", onDocumentVisibility);
    motionQuery?.addEventListener("change", onMotionChange);
    staticCapabilityQuery?.addEventListener("change", onStaticCapabilityChange);

    const observer = typeof window.IntersectionObserver === "function"
      ? new window.IntersectionObserver(([entry]) => {
        visibleRef.current = entry?.isIntersecting ?? true;
        syncAnimation();
      }, { threshold: 0.05 })
      : null;
    observer?.observe(root);
    syncAnimation();

    return () => {
      document.removeEventListener("visibilitychange", onDocumentVisibility);
      motionQuery?.removeEventListener("change", onMotionChange);
      staticCapabilityQuery?.removeEventListener("change", onStaticCapabilityChange);
      observer?.disconnect();
      stopAnimation();
      animationSyncRef.current = null;
    };
  }, []);

  function activate(index: number) {
    activeRef.current = index;
    setActiveIndex(index);
  }

  function moveSelection(direction: number) {
    const next = nextAtlasIndex(activeRef.current, direction, destinations.length);
    activate(next);
    linkRefs.current[next]?.focus({ preventScroll: true });
  }

  function handleStageKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    }
  }

  function togglePause() {
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    animationSyncRef.current?.();
  }

  if (!activeDestination) return null;

  return (
    <div
      ref={rootRef}
      className="atlas-navigator__island"
      data-atlas-navigator="true"
      data-atlas-navigator-ready={hydrated ? "true" : "false"}
      data-atlas-navigator-suspended={suspended ? "true" : "false"}
      data-atlas-navigator-mode={staticCapability || reducedMotion ? "static" : paused ? "paused" : suspended ? "suspended" : "orbit"}
    >
      <div className="atlas-navigator__stage-wrap">
        <div className="atlas-navigator__toolbar" hidden={!hydrated || staticCapability || reducedMotion}>
          <span className="atlas-navigator__state" data-atlas-navigator-state aria-live="polite">
            {staticCapability || reducedMotion ? "STATIC LAYOUT" : paused ? "ORBIT PAUSED" : suspended ? "ORBIT SUSPENDED" : "ORBIT ACTIVE"}
          </span>
          <button
            className="atlas-navigator__pause"
            type="button"
            data-atlas-navigator-control="pause"
            aria-label={paused ? "Resume orbit" : "Pause orbit"}
            aria-pressed={paused}
            onClick={togglePause}
          >
            {paused ? "RESUME" : "PAUSE"}
          </button>
        </div>
        <div
          ref={stageRef}
          className="atlas-navigator__stage"
          tabIndex={0}
          role="toolbar"
          aria-orientation="horizontal"
          aria-label="Atlas destination navigator. Use arrow keys to move between destinations."
          onKeyDown={handleStageKeyDown}
        >
          <div className="atlas-navigator__orbit" aria-hidden="true">
            <span className="atlas-navigator__ring atlas-navigator__ring--outer" />
            <span className="atlas-navigator__ring atlas-navigator__ring--inner" />
          </div>
          <div className="atlas-navigator__nodes">
            {destinations.map((destination, index) => {
              const isActive = index === activeIndex;
              const position = positions[index] ?? { x: 0, y: 0 };
              return (
                <a
                  ref={(element) => { linkRefs.current[index] = element; }}
                  className={`atlas-navigator__node atlas-destination${isActive ? " is-active" : ""}`}
                  data-atlas-node={destination.code}
                  data-atlas-index={index}
                  data-atlas-active={isActive ? "true" : "false"}
                  href={destination.href}
                  aria-describedby={isActive ? "atlas-active-preview" : undefined}
                  onFocus={() => activate(index)}
                  onPointerEnter={() => activate(index)}
                  style={positionStyle(position.x, position.y)}
                >
                  <span className="atlas-navigator__node-content">
                    <span className="atlas-destination__code">{destination.code}</span>
                    <strong>{destination.label}</strong>
                    <span className="atlas-destination__link">ENTER <span aria-hidden="true">↗</span></span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
      <aside id="atlas-active-preview" className="atlas-navigator__preview" aria-live="polite" aria-label="Active destination preview">
        <span className="atlas-navigator__preview-code">ACTIVE / {activeDestination.code}</span>
        <h3>{activeDestination.label}</h3>
        <p>{activeDestination.description}</p>
        <span className="atlas-navigator__preview-hint">FOCUS A NODE · ARROW KEYS TO MOVE</span>
      </aside>
    </div>
  );
}
