import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseHtml, descendants } from "./check-static-site.mjs";

const JS_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);

function normalizeAssetPath(value) {
  return String(value ?? "").replace(/^\/+/, "").replace(/\\/g, "/");
}

function relativeImport(from, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.posix.dirname(normalizeAssetPath(from));
  return normalizeAssetPath(path.posix.normalize(path.posix.join(base, specifier)));
}

async function collectFiles(directory) {
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) files.push(file);
    }
  }
  await visit(directory);
  return files.toSorted();
}

async function collectHtmlFiles(directory) {
  return (await collectFiles(directory)).filter((file) => file.endsWith(".html"));
}

async function loadManifest(outputDir) {
  const candidates = [
    path.join(outputDir, ".vite", "manifest.json"),
    path.join(outputDir, "astro-manifest.json"),
    path.join(outputDir, "_astro", "manifest.json"),
  ];
  for (const file of candidates) {
    try {
      const value = JSON.parse(await readFile(file, "utf8"));
      if (value && typeof value === "object" && !Array.isArray(value)) return { value, file };
    } catch {
      // Static Astro builds normally remove the private .vite manifest. The
      // emitted island attributes remain a stable, executable fallback.
    }
  }
  return null;
}

function parseImports(source) {
  const staticImports = new Set();
  const dynamicImports = new Set();
  const dynamicPattern = /\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
  for (const match of source.matchAll(dynamicPattern)) dynamicImports.add(match[1]);
  const staticPattern = /\b(?:from\s*["']|import\s*["']|export\s+[^;]*?\sfrom\s*["'])((?:\.{1,2}\/)[^"']+)["']/g;
  for (const match of source.matchAll(staticPattern)) staticImports.add(match[1]);
  return { staticImports, dynamicImports };
}

function assetPathFromUrl(value, basePath) {
  try {
    const url = new URL(value, "https://static.invalid/");
    if (url.origin !== "https://static.invalid") return null;
    let pathname = decodeURIComponent(url.pathname);
    if (basePath !== "/") {
      if (pathname === basePath.slice(0, -1)) pathname = "/";
      else if (pathname.startsWith(basePath)) pathname = pathname.slice(basePath.length - 1) || "/";
      else return null;
    }
    return normalizeAssetPath(pathname);
  } catch {
    return null;
  }
}

function normalizeBasePath(value = "/") {
  if (value === "/") return "/";
  return `/${String(value).replace(/^\/+|\/+$/g, "")}/`;
}

async function initialReferences(outputDir, basePath) {
  const references = new Set();
  for (const htmlFile of await collectHtmlFiles(outputDir)) {
    const document = parseHtml(await readFile(htmlFile, "utf8"));
    for (const node of descendants(document)) {
      for (const attribute of ["component-url", "renderer-url", "src"]) {
        const value = node.attrs.get(attribute);
        if (!value) continue;
        const asset = assetPathFromUrl(value, basePath);
        if (asset) references.add(asset);
      }
    }
  }
  return references;
}

function emittedAssetMap(outputDir, files) {
  return new Map(files.filter((file) => JS_EXTENSIONS.has(path.extname(file))).map((file) => [normalizeAssetPath(path.relative(outputDir, file)), file]));
}

function manifestEntries(manifest) {
  return Object.entries(manifest ?? {}).map(([key, value]) => [key, value]).filter(([, value]) => value && typeof value === "object" && typeof value.file === "string");
}

function buildManifestIndexes(manifest) {
  const entries = manifestEntries(manifest);
  const byFile = new Map(entries.map(([key, value]) => [normalizeAssetPath(value.file), { key, value }]));
  return { entries, byFile };
}

function staticClosure(seedPaths, assets, manifestIndex) {
  const visited = new Set();
  const queue = [...seedPaths];
  while (queue.length) {
    const current = normalizeAssetPath(queue.shift());
    if (visited.has(current)) continue;
    visited.add(current);
    const asset = assets.get(current);
    const manifestEntry = manifestIndex?.byFile.get(current)?.value;
    if (manifestEntry?.imports) {
      for (const importedKey of manifestEntry.imports) {
        const imported = manifestIndex.byFile.get(normalizeAssetPath(manifestIndex.entries.find(([key]) => key === importedKey)?.[1]?.file ?? importedKey));
        const target = imported?.value?.file ?? manifestIndex.byFile.get(normalizeAssetPath(importedKey))?.value?.file ?? importedKey;
        if (assets.has(normalizeAssetPath(target))) queue.push(target);
      }
    }
    if (!asset) continue;
    for (const specifier of parseImports(asset.source).staticImports) {
      const target = relativeImport(current, specifier);
      if (target && assets.has(target)) queue.push(target);
    }
  }
  return visited;
}

function packageForAsset(asset, manifestRecord) {
  const sourceKey = `${manifestRecord?.key ?? ""} ${asset.path}`.toLowerCase();
  if (sourceKey.includes("node_modules/three") || sourceKey.includes("three.module")) return "three";
  if (sourceKey.includes("node_modules/cytoscape") || sourceKey.includes("cytoscape")) return "cytoscape";
  const staticImports = parseImports(asset.source).staticImports;
  if ([...staticImports].some((specifier) => /(?:^|\/)three(?:\.module)?(?:\.js)?$/.test(specifier))) return "three";
  if ([...staticImports].some((specifier) => /(?:^|\/)cytoscape(?:\.js)?$/.test(specifier))) return "cytoscape";
  return null;
}

export async function checkBundleBudget(outputDirectory = "dist", options = {}) {
  const outputDir = path.resolve(outputDirectory);
  const basePath = normalizeBasePath(options.basePath ?? process.env.BASE_PATH ?? "/");
  const files = await collectFiles(outputDir);
  const emitted = emittedAssetMap(outputDir, files);
  const assets = new Map();
  for (const [assetPath, file] of emitted) {
    assets.set(assetPath, { path: assetPath, source: await readFile(file, "utf8") });
  }

  const loadedManifest = await loadManifest(outputDir);
  const manifestIndex = loadedManifest ? buildManifestIndexes(loadedManifest.value) : null;
  const references = await initialReferences(outputDir, basePath);
  const seedPaths = new Set([...references].filter((asset) => assets.has(asset)));
  if (!seedPaths.size && manifestIndex) {
    for (const [, entry] of manifestIndex.entries) if (entry.isEntry && assets.has(normalizeAssetPath(entry.file))) seedPaths.add(normalizeAssetPath(entry.file));
  }
  const initial = staticClosure(seedPaths, assets, manifestIndex);
  const reportAssets = [...assets.values()].map((asset) => ({
    path: asset.path,
    gzip: gzipSync(asset.source, { level: 9 }).length,
    initial: initial.has(asset.path),
  })).toSorted((a, b) => a.path.localeCompare(b.path));
  const initialInteractiveGzip = reportAssets.filter((asset) => asset.initial).reduce((sum, asset) => sum + asset.gzip, 0);
  const initialRecords = [...initial].map((assetPath) => ({ ...assets.get(assetPath), path: assetPath }));
  const packageNames = new Set(initialRecords.map((asset) => packageForAsset(asset, manifestIndex?.byFile.get(asset.path))));

  return {
    initialInteractiveGzip,
    sharedIncludesThree: packageNames.has("three"),
    sharedIncludesCytoscape: packageNames.has("cytoscape"),
    assets: reportAssets,
    basePath,
    manifest: loadedManifest?.file ?? null,
    initialEntries: [...seedPaths].toSorted(),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const report = await checkBundleBudget(process.argv[2] ?? "dist");
    const budget = Number(process.env.INTERACTIVE_GZIP_BUDGET ?? 120 * 1024);
    if (report.initialInteractiveGzip > budget) throw new Error(`Initial interactive gzip ${report.initialInteractiveGzip} exceeds ${budget}: ${JSON.stringify(report)}`);
    if (report.sharedIncludesThree || report.sharedIncludesCytoscape) throw new Error(`Lazy package entered initial graph: ${JSON.stringify(report)}`);
    console.log(JSON.stringify({ ...report, budget, status: "ok" }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
