/**
 * The single base-path contract shared by Astro templates and client islands.
 *
 * Vite exposes BASE_URL through import.meta.env in a browser build. Keeping a
 * Node-safe fallback here lets the same helper remain executable in unit
 * tests and server-side tooling without inventing a deployment slug.
 */
const buildEnv = import.meta.env;
const buildBasePath = buildEnv && typeof buildEnv.BASE_URL === "string" ? buildEnv.BASE_URL : "/";

export function getBasePath() {
  return buildBasePath;
}

export function withBase(path, base = buildBasePath) {
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(path)) {
    return path;
  }

  const normalizedBase = `/${String(base || "/").replace(/^\/+|\/+$/g, "")}/`;
  const normalizedPath = String(path || "/").replace(/^\/+/, "");
  return normalizedBase === "//" ? `/${normalizedPath}` : `${normalizedBase}${normalizedPath}`;
}
