/**
 * Join an app-relative path to Astro's configured base path.
 *
 * The explicit base argument keeps this pure helper easy to test while the
 * default reads the value injected by Astro for the current deployment.
 */
export function withBase(path, base = import.meta.env.BASE_URL) {
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(path)) {
    return path;
  }

  const normalizedBase = `/${String(base || "/").replace(/^\/+|\/+$/g, "")}/`;
  const normalizedPath = String(path || "/").replace(/^\/+/, "");
  return normalizedBase === "//" ? `/${normalizedPath}` : `${normalizedBase}${normalizedPath}`;
}
