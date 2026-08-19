export function evaluateHeroCapabilities({ reducedMotion, finePointer, viewportWidth }) {
  const enhanced = !reducedMotion && finePointer && viewportWidth >= 768;
  return {
    status: enhanced ? "enhanced" : "capability-fallback",
    enhanced,
  };
}
