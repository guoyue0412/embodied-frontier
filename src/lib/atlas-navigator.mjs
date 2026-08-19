/**
 * Pure geometry and selection helpers for the Atlas navigator.
 *
 * Keeping these functions free of DOM/runtime dependencies makes the orbit
 * deterministic in the browser and directly testable during the build.
 */

export function computeAtlasPositions(count, radius) {
  if (!Number.isInteger(count) || count <= 0) return [];

  const safeRadius = Number.isFinite(radius) ? radius : 0;
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return {
      x: Math.cos(angle) * safeRadius,
      y: Math.sin(angle) * safeRadius,
    };
  });
}

export function nextAtlasIndex(current, direction, count) {
  if (!Number.isInteger(count) || count <= 0) return 0;

  const normalizedCurrent = ((Number.isInteger(current) ? current : 0) % count + count) % count;
  const step = direction < 0 ? -1 : direction > 0 ? 1 : 0;
  return (normalizedCurrent + step + count) % count;
}
