import { gzipSync } from "node:zlib";
import { access, readFile, readdir } from "node:fs/promises";
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
  let found = false;
  for (const file of candidates) {
    try {
      await access(file);
      found = true;
      const value = JSON.parse(await readFile(file, "utf8"));
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("manifest root must be an object");
      for (const [key, entry] of Object.entries(value)) {
        if (!entry || typeof entry !== "object" || typeof entry.file !== "string" || !entry.file.trim()) {
          throw new Error(`manifest entry ${key} has no emitted file`);
        }
        for (const field of ["imports", "dynamicImports"]) {
          if (entry[field] !== undefined && !Array.isArray(entry[field])) throw new Error(`manifest entry ${key}.${field} must be an array`);
        }
      }
      return { value, file };
    } catch (error) {
      if (found) throw new Error(`Astro client manifest is missing or unparseable at ${file}: ${error.message}`);
    }
  }
  throw new Error(`Astro client manifest is missing in ${outputDir}; expected astro-manifest.json or .vite/manifest.json`);
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

function documentPathForFile(file, outputDir, basePath) {
  const relative = path.relative(outputDir, file).replace(/\\/g, "/");
  if (relative === "index.html") return basePath;
  const route = relative.endsWith("/index.html") ? relative.slice(0, -"index.html".length) : relative;
  return `${basePath}${route}`;
}

function assetPathFromUrl(value, basePath, currentFile, outputDir) {
  try {
    const url = new URL(value, `https://static.invalid${documentPathForFile(currentFile, outputDir, basePath)}`);
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
      const modulePreload = node.tagName === "link" && /\bmodulepreload\b/i.test(node.attrs.get("rel") ?? "");
      const scriptSource = node.tagName === "script" && node.attrs.has("src");
      const islandSource = ["component-url", "renderer-url"].some((attribute) => node.attrs.has(attribute));
      const attributes = [
        ...(modulePreload ? ["href"] : []),
        ...(scriptSource ? ["src"] : []),
        ...(islandSource ? ["component-url", "renderer-url"] : []),
      ];
      for (const attribute of attributes) {
        const value = node.attrs.get(attribute);
        if (!value) continue;
        const asset = assetPathFromUrl(value, basePath, htmlFile, outputDir);
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
  const byKey = new Map(entries);
  return { entries, byFile, byKey };
}

function resolveManifestReference(reference, owner, field, assets, manifestIndex) {
  const normalizedReference = normalizeAssetPath(reference);
  const manifestRecord = manifestIndex.byKey.get(reference) ?? manifestIndex.byKey.get(normalizedReference);
  const target = normalizeAssetPath(manifestRecord?.[1]?.file ?? normalizedReference);
  if (!manifestRecord && !assets.has(target)) {
    throw new Error(`Manifest ${field} reference ${reference} from ${owner} is missing from the manifest and disk`);
  }
  if (!assets.has(target)) {
    throw new Error(`Manifest ${field} reference ${reference} from ${owner} points to missing disk asset ${target}`);
  }
  return target;
}

function validateManifestReferences(manifestIndex, assets) {
  for (const [key, entry] of manifestIndex.entries) {
    const entryPath = normalizeAssetPath(entry.file);
    if (!assets.has(entryPath)) throw new Error(`Manifest entry ${key} points to missing disk asset ${entryPath}`);
    for (const field of ["imports", "dynamicImports"]) {
      for (const reference of entry[field] ?? []) resolveManifestReference(reference, key, field, assets, manifestIndex);
    }
  }
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
        queue.push(resolveManifestReference(importedKey, manifestEntry.file, "imports", assets, manifestIndex));
      }
    }
    if (!asset) throw new Error(`Initial JavaScript asset is missing from disk: ${current}`);
    for (const specifier of parseImports(asset.source).staticImports) {
      const target = relativeImport(current, specifier);
      if (!target) continue;
      if (!assets.has(target)) throw new Error(`Static import ${specifier} from ${current} is missing from disk: ${target}`);
      queue.push(target);
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
  const emittedFiles = new Set(files.map((file) => normalizeAssetPath(path.relative(outputDir, file))));
  const emitted = emittedAssetMap(outputDir, files);
  const assets = new Map();
  for (const [assetPath, file] of emitted) {
    assets.set(assetPath, { path: assetPath, source: await readFile(file, "utf8") });
  }

  const loadedManifest = await loadManifest(outputDir);
  const manifestIndex = buildManifestIndexes(loadedManifest.value);
  validateManifestReferences(manifestIndex, emitted);
  const references = await initialReferences(outputDir, basePath);
  for (const reference of references) {
    if (!emittedFiles.has(reference)) throw new Error(`Initial JavaScript reference is missing from disk: ${reference}`);
    if (!assets.has(reference)) throw new Error(`Initial JavaScript reference is not an emitted JavaScript asset: ${reference}`);
  }
  const seedPaths = new Set(references);
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
    manifest: path.relative(process.cwd(), loadedManifest.file) || loadedManifest.file,
    initialEntries: [...seedPaths].toSorted(),
  };
}

export function enforceBundleBudget(report, budget = 120 * 1024) {
  if (report.initialInteractiveGzip > budget) {
    throw new Error(`Initial interactive gzip ${report.initialInteractiveGzip} exceeds ${budget}: ${JSON.stringify(report)}`);
  }
  if (report.sharedIncludesThree || report.sharedIncludesCytoscape) {
    throw new Error(`Lazy package entered initial graph: ${JSON.stringify(report)}`);
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const report = await checkBundleBudget(process.argv[2] ?? "dist");
    const budget = Number(process.env.INTERACTIVE_GZIP_BUDGET ?? 120 * 1024);
    enforceBundleBudget(report, budget);
    console.log(JSON.stringify({ ...report, budget, status: "ok" }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
