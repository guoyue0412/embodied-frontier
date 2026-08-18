import { lazy, Suspense, useEffect, useState } from "react";
import DotGrid from "../vendor/react-bits/DotGrid/DotGrid";
import { withBase } from "../../lib/site-path.mjs";

const GridDistortion = lazy(() => import("../vendor/react-bits/GridDistortion/GridDistortion"));

interface CapabilityState {
  enhanced: boolean;
}

function readCapabilities(): CapabilityState {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  return { enhanced: !reduced && finePointer && window.innerWidth >= 768 };
}

interface HeroExperienceProps {
  imageSrc?: string;
}

export default function HeroExperience({ imageSrc = "/hero-static.webp" }: HeroExperienceProps) {
  const [capabilities, setCapabilities] = useState<CapabilityState>({ enhanced: false });

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
    <div className="hero-experience" aria-hidden="true" data-motion-only="true" data-enhanced={capabilities.enhanced ? "true" : "false"}>
      {capabilities.enhanced && (
        <>
          <div className="hero-experience__dots">
            <DotGrid dotSize={2} gap={22} baseColor="#18314d" activeColor="#48dff6" proximity={140} shockRadius={180} />
          </div>
          <div className="hero-experience__distortion">
            <Suspense fallback={null}>
              <GridDistortion imageSrc={withBase(imageSrc)} grid={18} mouse={0.1} strength={0.12} relaxation={0.92} />
            </Suspense>
          </div>
        </>
      )}
    </div>
  );
}
