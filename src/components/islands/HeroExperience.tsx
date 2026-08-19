import React, { lazy, Suspense, useEffect, useState } from "react";
import DotGrid from "../vendor/react-bits/DotGrid/DotGrid";
import EmbodimentUnit from "./EmbodimentUnit";
import { withBase } from "../../lib/site-path.mjs";
import { evaluateHeroCapabilities } from "../../lib/hero-capabilities.mjs";

const GridDistortion = lazy(() => import("../vendor/react-bits/GridDistortion/GridDistortion"));

class VisualErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[HeroExperience] optional visual enhancement disabled; static hero remains active.", error);
  }

  render() {
    return this.state.failed
      ? <div className="hero-experience__visual-fallback" data-visual-failed="boundary" data-visual-state="fallback" aria-hidden="true" />
      : this.props.children;
  }
}

interface CapabilityState {
  status: "initializing" | "enhanced" | "capability-fallback";
  enhanced: boolean;
}

function readCapabilities(): CapabilityState {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  return evaluateHeroCapabilities({ reducedMotion: reduced, finePointer, viewportWidth: window.innerWidth });
}

interface HeroExperienceProps {
  imageSrc?: string;
}

export default function HeroExperience({ imageSrc = "/hero-static.webp" }: HeroExperienceProps) {
  const [capabilities, setCapabilities] = useState<CapabilityState>({ status: "initializing", enhanced: false });

  useEffect(() => {
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(pointer: fine)");
    const update = () => setCapabilities(readCapabilities());

    update();
    window.addEventListener("resize", update, { passive: true });
    reducedQuery.addEventListener?.("change", update);
    pointerQuery.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("resize", update);
      reducedQuery.removeEventListener?.("change", update);
      pointerQuery.removeEventListener?.("change", update);
    };
  }, []);

  return (
    <div className="hero-experience" aria-hidden="true" data-motion-only="true" data-hero-capability-state={capabilities.status} data-enhanced={capabilities.enhanced ? "true" : "false"}>
      {capabilities.enhanced && (
        <>
          <div className="hero-experience__dots">
            <DotGrid dotSize={2} gap={22} baseColor="#18314d" activeColor="#48dff6" proximity={140} shockRadius={180} />
          </div>
          <div className="hero-experience__distortion">
            <VisualErrorBoundary>
              <Suspense fallback={null}>
                <GridDistortion imageSrc={withBase(imageSrc)} grid={18} mouse={0.1} strength={0.12} relaxation={0.92} />
              </Suspense>
            </VisualErrorBoundary>
          </div>
        </>
      )}
      <div className="hero-experience__embodiment">
        <EmbodimentUnit imageSrc={imageSrc} />
      </div>
    </div>
  );
}
