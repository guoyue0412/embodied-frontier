import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const INTERACTIVE_ROLES = new Set(["button", "checkbox", "combobox", "link", "menuitem", "option", "radio", "searchbox", "slider", "spinbutton", "switch", "tab", "textbox"]);
const URL_ATTRIBUTES = ["href", "src", "action", "formaction", "poster"];

function decodeEntities(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function parseAttributes(raw) {
  const attrs = new Map();
  const body = raw.replace(/^\s*[^\s/>]+/, "").replace(/\/\s*$/, "");
  let index = 0;
  while (index < body.length) {
    while (/\s/.test(body[index] ?? "")) index += 1;
    if (index >= body.length) break;
    const nameStart = index;
    while (index < body.length && !/[\s=/>]/.test(body[index])) index += 1;
    if (nameStart === index) {
      index += 1;
      continue;
    }
    const name = body.slice(nameStart, index).toLowerCase();
    while (/\s/.test(body[index] ?? "")) index += 1;
    let value = "";
    if (body[index] === "=") {
      index += 1;
      while (/\s/.test(body[index] ?? "")) index += 1;
      const quote = body[index];
      if (quote === '"' || quote === "'") {
        index += 1;
        const valueStart = index;
        while (index < body.length && body[index] !== quote) index += 1;
        value = body.slice(valueStart, index);
        if (body[index] === quote) index += 1;
      } else {
        const valueStart = index;
        while (index < body.length && !/[\s>]/.test(body[index])) index += 1;
        value = body.slice(valueStart, index);
      }
    }
    attrs.set(name, decodeEntities(value));
  }
  return attrs;
}

function createNode(tagName, attrs = new Map(), parent = null) {
  return { tagName, attrs, parent, children: [], text: "", selfClosing: false };
}

export function parseHtml(source) {
  const root = createNode("#document");
  const stack = [root];
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf("<", index);
    if (open < 0) {
      stack.at(-1).text += source.slice(index);
      break;
    }
    if (open > index) stack.at(-1).text += source.slice(index, open);
    if (source.startsWith("<!--", open)) {
      const close = source.indexOf("-->", open + 4);
      index = close < 0 ? source.length : close + 3;
      continue;
    }
    let cursor = open + 1;
    let quote = null;
    while (cursor < source.length) {
      const character = source[cursor];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        break;
      }
      cursor += 1;
    }
    if (cursor >= source.length) {
      stack.at(-1).text += source.slice(open);
      break;
    }
    const raw = source.slice(open + 1, cursor);
    index = cursor + 1;
    if (/^\s*!/.test(raw) || /^\s*\?/.test(raw)) continue;
    const closing = /^\s*\/\s*([\w:-]+)/.exec(raw);
    if (closing) {
      const tagName = closing[1].toLowerCase();
      const stackIndex = stack.findLastIndex((node) => node.tagName === tagName);
      if (stackIndex > 0) stack.length = stackIndex;
      continue;
    }
    const start = /^\s*([\w:-]+)/.exec(raw);
    if (!start) continue;
    const tagName = start[1].toLowerCase();
    const node = createNode(tagName, parseAttributes(raw), stack.at(-1));
    node.selfClosing = /\/\s*$/.test(raw) || VOID_ELEMENTS.has(tagName);
    stack.at(-1).children.push(node);
    if (!node.selfClosing) {
      stack.push(node);
      if (tagName === "script" || tagName === "style") {
        const endTag = new RegExp(`</${tagName}\\s*>`, "ig");
        endTag.lastIndex = index;
        const match = endTag.exec(source);
        if (match) {
          node.text += source.slice(index, match.index);
          index = match.index + match[0].length;
          stack.pop();
        } else {
          node.text += source.slice(index);
          index = source.length;
          stack.pop();
        }
      }
    }
  }
  return root;
}

function walk(node, callback) {
  for (const child of node.children) {
    callback(child);
    walk(child, callback);
  }
}

export function descendants(node) {
  const result = [];
  walk(node, (child) => result.push(child));
  return result;
}

function textContent(node) {
  if (node.tagName === "script" || node.tagName === "style") return "";
  return `${node.text} ${node.children.map(textContent).join(" ")}`.replace(/\s+/g, " ").trim();
}

function selector(node) {
  const parts = [];
  let current = node;
  while (current && current.tagName !== "#document") {
    const id = current.attrs.get("id");
    if (id) {
      parts.unshift(`${current.tagName}#${id}`);
      break;
    }
    const siblings = current.parent?.children.filter((candidate) => candidate.tagName === current.tagName) ?? [];
    const position = siblings.indexOf(current) + 1;
    parts.unshift(`${current.tagName}:nth-of-type(${position})`);
    current = current.parent;
  }
  return parts.join(" > ");
}

function normalizeBasePath(value = "/") {
  const pathValue = String(value || "/").trim();
  if (pathValue === "/") return "/";
  return `/${pathValue.replace(/^\/+|\/+$/g, "")}/`;
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

function reportError(errors, file, node, message) {
  errors.push(`${file}: ${selector(node)} — ${message}`);
}

function accessibleName(node, idMap) {
  const aria = node.attrs.get("aria-label");
  if (aria?.trim()) return aria.trim();
  const labelledBy = node.attrs.get("aria-labelledby");
  if (labelledBy) {
    const labelled = labelledBy.split(/\s+/).map((id) => idMap.get(id)).filter(Boolean).map(textContent).join(" ").trim();
    if (labelled) return labelled;
  }
  const title = node.attrs.get("title");
  if (title?.trim()) return title.trim();
  const nestedText = textContent(node);
  if (nestedText) return nestedText;
  if (node.tagName === "input" || node.tagName === "textarea" || node.tagName === "select") {
    const id = node.attrs.get("id");
    if (id) {
      const label = idMap.get(`label-for:${id}`);
      if (label) return textContent(label);
    }
  }
  return "";
}

function isInteractive(node) {
  if (node.attrs.get("aria-hidden") === "true" || node.attrs.get("hidden") !== undefined) return false;
  if (node.tagName === "a") return node.attrs.has("href");
  if (["button", "input", "select", "textarea", "summary"].includes(node.tagName)) {
    return node.tagName !== "input" || node.attrs.get("type")?.toLowerCase() !== "hidden";
  }
  return INTERACTIVE_ROLES.has(node.attrs.get("role") ?? "") || node.attrs.get("contenteditable") === "true";
}

function routeFileForPath(outputDir, pathname) {
  const cleanPath = pathname.replace(/^\/+/, "");
  const candidates = [];
  if (!cleanPath) candidates.push(path.join(outputDir, "index.html"));
  else if (cleanPath.endsWith("/")) candidates.push(path.join(outputDir, cleanPath, "index.html"));
  else {
    candidates.push(path.join(outputDir, cleanPath));
    candidates.push(path.join(outputDir, cleanPath, "index.html"));
    candidates.push(path.join(outputDir, `${cleanPath}.html`));
  }
  return candidates;
}

function stripConfiguredBase(pathname, basePath) {
  if (basePath === "/") return pathname || "/";
  if (pathname === basePath.slice(0, -1) || pathname.startsWith(basePath)) return pathname.slice(basePath.length - 1) || "/";
  return null;
}

function checkUrl({ value, node, attribute, file, outputDir, basePath, idsByFile, existingFiles, currentFile, errors }) {
  const raw = value.trim();
  if (!raw || raw.startsWith("#")) {
    if (raw.startsWith("#") && raw.length > 1 && !idsByFile.get(currentFile)?.has(raw.slice(1))) reportError(errors, file, node, `${attribute} fragment target not found: ${raw}`);
    return;
  }
  if (/^javascript\s*:/i.test(raw)) {
    reportError(errors, file, node, `${attribute} uses a javascript: URL`);
    return;
  }
  let parsed;
  try {
    parsed = new URL(raw, "https://static.invalid/");
  } catch {
    reportError(errors, file, node, `${attribute} is not a valid URL: ${raw}`);
    return;
  }
  if (["mailto:", "tel:"].includes(parsed.protocol)) return;
  if (!["http:", "https:"].includes(parsed.protocol)) {
    if (attribute === "src" && parsed.protocol === "data:") return;
    reportError(errors, file, node, `${attribute} uses unsupported URL scheme: ${parsed.protocol}`);
    return;
  }
  if (parsed.origin !== "https://static.invalid") return;
  const routePath = stripConfiguredBase(parsed.pathname, basePath);
  if (routePath === null) {
    reportError(errors, file, node, `${attribute} escapes configured base ${basePath}: ${raw}`);
    return;
  }
  const candidates = routeFileForPath(outputDir, routePath);
  const target = candidates.find((candidate) => existingFiles.has(candidate));
  if (!target) {
    reportError(errors, file, node, `${attribute} internal target not found: ${raw}`);
    return;
  }
  if (parsed.hash && !idsByFile.get(target)?.has(parsed.hash.slice(1))) reportError(errors, file, node, `${attribute} fragment target not found: ${raw}`);
}

export async function checkStaticSite(outputDirectory = "dist", options = {}) {
  const outputDir = path.resolve(outputDirectory);
  const basePath = normalizeBasePath(options.basePath ?? process.env.BASE_PATH ?? "/");
  const existingFiles = new Set(await collectFiles(outputDir));
  const files = await collectHtmlFiles(outputDir);
  const documents = new Map();
  const idsByFile = new Map();
  const errors = [];

  for (const absoluteFile of files) {
    const source = await readFile(absoluteFile, "utf8");
    const document = parseHtml(source);
    documents.set(absoluteFile, document);
    const ids = new Set();
    for (const node of descendants(document)) {
      const id = node.attrs.get("id");
      if (id) ids.add(id);
    }
    idsByFile.set(absoluteFile, ids);
  }

  for (const [absoluteFile, document] of documents) {
    const displayFile = path.relative(process.cwd(), absoluteFile) || absoluteFile;
    const nodes = descendants(document);
    const mains = nodes.filter((node) => node.tagName === "main");
    const headings = nodes.filter((node) => node.tagName === "h1");
    if (mains.length !== 1) errors.push(`${displayFile}: expected exactly one <main>, found ${mains.length}`);
    if (headings.length !== 1) errors.push(`${displayFile}: expected exactly one <h1>, found ${headings.length}`);
    const html = nodes.find((node) => node.tagName === "html");
    if (!html?.attrs.get("lang")?.trim()) reportError(errors, displayFile, html ?? document, "<html> is missing a language attribute");

    const idMap = new Map();
    for (const node of nodes) {
      const id = node.attrs.get("id");
      if (id) idMap.set(id, node);
      const forId = node.attrs.get("for");
      if (node.tagName === "label" && forId) idMap.set(`label-for:${forId}`, node);
    }
    for (const node of nodes) {
      if (node.tagName === "img" && !node.attrs.has("alt")) reportError(errors, displayFile, node, "image is missing alt text");
      for (const attribute of URL_ATTRIBUTES) {
        const value = node.attrs.get(attribute);
        if (value !== undefined) checkUrl({ value, node, attribute, file: displayFile, outputDir, basePath, idsByFile, existingFiles, currentFile: absoluteFile, errors });
      }
      if (isInteractive(node) && !accessibleName(node, idMap)) reportError(errors, displayFile, node, "interactive control has no accessible name");
      if (node.tagName === "iframe" && !node.attrs.get("title")?.trim()) reportError(errors, displayFile, node, "iframe is missing a title");
      if (node.attrs.has("onclick") || node.attrs.has("onkeydown") || node.attrs.has("onkeyup")) reportError(errors, displayFile, node, "inline event handlers are not allowed");
      if (node.tagName === "a" && node.attrs.get("target") === "_blank" && !/\bnoopener\b/i.test(node.attrs.get("rel") ?? "")) reportError(errors, displayFile, node, "target=_blank link is missing rel=noopener");
    }
  }

  const report = { outputDirectory: outputDir, basePath, files: files.length, errors: [...errors] };
  if (errors.length) {
    const error = new Error(`Static site checks failed with ${errors.length} error(s)`);
    error.report = report;
    throw error;
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const report = await checkStaticSite(process.argv[2] ?? "dist");
    console.log(JSON.stringify({ ...report, status: "ok" }, null, 2));
  } catch (error) {
    console.error(error.message);
    if (error.report?.errors) console.error(error.report.errors.join("\n"));
    process.exitCode = 1;
  }
}
