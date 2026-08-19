import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "h2", "h3", "h4", "p", "ul", "ol", "li", "blockquote", "strong", "em",
  "code", "pre", "a", "hr", "table", "thead", "tbody", "tr", "th", "td",
  "figure", "figcaption", "img", "span", "div",
];

const sanitizeOptions = {
  allowedTags,
  allowedAttributes: {
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    a: ["href", "target", "rel", "class", "aria-label", "data-lightbox-src"],
    code: ["class"],
    pre: ["class"],
    figure: ["class"],
    figcaption: ["class"],
    img: ["src", "alt", "title", "loading", "decoding", "data-lightbox-src"],
    span: ["class", "role", "aria-label"],
    div: ["class", "role", "aria-label"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: "a",
      attribs: { ...attribs, target: "_blank", rel: "noreferrer noopener" },
    }),
  },
};

function headingId(text, usedIds) {
  const base = text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) id = `${base}-${suffix++}`;
  usedIds.add(id);
  return id;
}

function plainInline(text) {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}

function safeMediaUrl(value) {
  try {
    const url = new URL(value);
    return new Set(["http:", "https:"]).has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseInfoAttributes(info) {
  const attributes = {};
  const attributePattern = /([a-z][a-z0-9_-]*)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi;
  for (const match of info.matchAll(attributePattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

function plainMetadata(value, fallback) {
  const text = plainInline(value ?? "");
  return text || fallback;
}

function safeRecordSources(recordSources) {
  if (!Array.isArray(recordSources)) return [];
  return recordSources
    .map((source) => ({
      label: plainMetadata(source?.label, "记录来源"),
      url: safeMediaUrl(source?.url),
    }))
    .filter((source) => source.url);
}

function resolveProvenance(attributes, recordSources) {
  const fieldUrl = safeMediaUrl(attributes.source);
  if (fieldUrl) {
    return {
      label: plainMetadata(attributes.sourcelabel ?? attributes["source-label"], "字段来源"),
      url: fieldUrl,
    };
  }
  return recordSources[0] ? {
    label: recordSources[0].label + "（记录来源）",
    url: recordSources[0].url,
  } : null;
}

function provenanceMarkup(source) {
  return source
    ? "<a class=\"prose-fallback__source\" href=\"" + escapeHtml(source.url) + "\" target=\"_blank\" rel=\"noreferrer noopener\">" + escapeHtml(source.label) + " ↗</a>"
    : "<span class=\"prose-provenance-missing\">来源未提供</span>";
}

function fallbackMetadata(attributes, defaults) {
  return {
    title: plainMetadata(attributes.title, defaults.title),
    description: plainMetadata(attributes.description ?? attributes.alt, defaults.description),
  };
}

function renderFallbackFigure({ className, role, title, description, source, codeClass, text }) {
  return "<figure class=\"prose-fallback " + className + "\"><div class=\"" + className + "\" role=\"" + role + "\" aria-label=\"" + escapeHtml(description) + "\"><pre><code class=\"" + codeClass + "\">" + escapeHtml(text) + "</code></pre></div><figcaption><span class=\"prose-fallback__title\">" + escapeHtml(title) + "</span><span class=\"prose-fallback__description\">" + escapeHtml(description) + "</span>" + provenanceMarkup(source) + "</figcaption></figure>";
}

function formulaDescription(formula) {
  return plainMetadata(formula, "公式表达式").replace(/\\/g, "");
}

function renderInlineFormula({ formula, attributes, recordSources }) {
  const metadata = fallbackMetadata(attributes, {
    title: "行内公式",
    description: "行内公式：" + formulaDescription(formula),
  });
  const source = resolveProvenance(attributes, recordSources);
  return "<span class=\"formula-inline\" role=\"math\" aria-label=\"" + escapeHtml(metadata.description) + "\">" + escapeHtml(formula) + "</span><span class=\"formula-inline-meta\"><span class=\"prose-fallback__title\">" + escapeHtml(metadata.title) + "</span><span class=\"prose-fallback__description\">" + escapeHtml(metadata.description) + "</span>" + provenanceMarkup(source) + "</span>";
}

function replaceInlineFormulaSyntax(markdown, inlineFormulas) {
  const formulaPattern = /(?<!\\)\$([^$\n]+?)\$(?!\$)|(?<!\\)\\\((.+?)(?<!\\)\\\)/g;
  const annotationPattern = /^\s*\{#formula\s+([^}\n]+)\}/;
  const lines = markdown.split("\n");
  const fencePrefix = String.fromCharCode(96).repeat(3);
  let fenced = false;
  let tokenIndex = 0;
  const output = [];

  for (const line of lines) {
    if (new RegExp("^\\s*(" + fencePrefix + "|~~~)").test(line)) {
      fenced = !fenced;
      output.push(line);
      continue;
    }
    if (fenced || /^\s{4,}/.test(line) || /^\s*\t/.test(line)) {
      output.push(line);
      continue;
    }
    let lastIndex = 0;
    let transformed = "";
    for (const match of line.matchAll(formulaPattern)) {
      const index = match.index ?? 0;
      const before = line.slice(0, index);
      const codeMark = String.fromCharCode(96);
      const unescapedCodeMarks = [...before].filter((character, offset) => character === codeMark && before[offset - 1] !== "\\").length;
      if (unescapedCodeMarks % 2 === 1) continue;
      const formula = match[1] ?? match[2] ?? "";
      const afterFormula = line.slice(index + match[0].length);
      const annotation = afterFormula.match(annotationPattern);
      const consumedLength = match[0].length + (annotation?.[0].length ?? 0);
      transformed += line.slice(lastIndex, index);
      const token = "EFINLINEFORMULA" + tokenIndex++ + "TOKEN";
      inlineFormulas.push({ token, formula, attributes: parseInfoAttributes(annotation?.[1] ?? "") });
      transformed += token;
      lastIndex = index + consumedLength;
    }
    output.push(transformed + line.slice(lastIndex));
  }
  return output.join("\n");
}

/**
 * Authoring contract:
 * - Fenced Mermaid/math blocks use title, description (or alt), and optional
 *   HTTP(S) source attributes in the info string.
 * - Inline $...$ and \\(...\\) formulas may be followed by
 *   {#formula title=\"...\" description=\"...\" source=\"...\"}.
 * - Missing field metadata falls back to the first validated paper record
 *   source; missing record context remains visibly unverified as \"来源未提供\".
 */
/**
 * @param {string} markdown
 * @param {{ recordSources?: Array<{ label?: string, url?: string }> }} [options]
 */
export function renderSafeMarkdownDocument(markdown, { recordSources = [] } = {}) {
  const headings = [];
  const usedIds = new Set();
  const inlineFormulas = [];
  const safeSources = safeRecordSources(recordSources);
  const preparedMarkdown = replaceInlineFormulaSyntax(markdown, inlineFormulas);
  let hasMedia = false;
  let hasMermaid = false;
  let hasFormula = false;
  const renderer = new marked.Renderer();
  renderer.heading = function heading({ tokens, depth }) {
    const inline = this.parser.parseInline(tokens);
    const text = plainInline(inline);
    // The page owns its only h1. Demote Markdown h1 input into the safe body heading set.
    const safeDepth = Math.min(Math.max(depth, 2), 4);
    const id = headingId(text, usedIds);
    headings.push({ depth: safeDepth, slug: id, text });
    return `<h${safeDepth} id="${id}">${inline}</h${safeDepth}>`;
  };
  renderer.text = ({ text }) => {
    const escaped = escapeHtml(text);
    return escaped.replace(/EFINLINEFORMULA(\d+)TOKEN/g, (_match, index) => {
      hasFormula = true;
      return renderInlineFormula({ ...inlineFormulas[Number(index)], recordSources: safeSources });
    });
  };
  renderer.image = ({ href, title, text }) => {
    const source = safeMediaUrl(href);
    const alt = escapeHtml(text || "论文图片");
    if (!source) return `<span class="prose-media-fallback">${alt}（图片来源不安全，已移除）</span>`;
    hasMedia = true;
    const safeTitle = title ? escapeHtml(title) : "";
    const caption = safeTitle || alt;
    return `<figure class="prose-figure"><a class="prose-figure__lightbox" href="${escapeHtml(source)}" data-lightbox-src="${escapeHtml(source)}" aria-label="打开图片：${alt}"><img src="${escapeHtml(source)}" alt="${alt}"${safeTitle ? ` title="${safeTitle}"` : ""} loading="lazy" decoding="async" data-lightbox-src="${escapeHtml(source)}"></a><figcaption><span>${caption}</span><a href="${escapeHtml(source)}">来源 ↗</a></figcaption></figure>`;
  };
  renderer.code = ({ text, lang }) => {
    const info = (lang || "").trim();
    const language = info.split(/\s+/, 1)[0].toLowerCase();
    const attributes = parseInfoAttributes(info);
    const codeText = text.replace(/\n$/, "");
    if (language === "mermaid") {
      hasMermaid = true;
      const metadata = fallbackMetadata(attributes, {
        title: "Mermaid 图示",
        description: "Mermaid 源码静态回退，保留研究关系文本。",
      });
      return renderFallbackFigure({
        className: "mermaid-diagram",
        role: "img",
        codeClass: "language-mermaid",
        text: codeText,
        source: resolveProvenance(attributes, safeSources),
        ...metadata,
      });
    }
    if (["math", "formula", "latex"].includes(language)) {
      hasFormula = true;
      const metadata = fallbackMetadata(attributes, {
        title: "公式",
        description: "公式源码静态回退，保留可读的数学表达。",
      });
      return renderFallbackFigure({
        className: "formula-block",
        role: "math",
        codeClass: "language-math",
        text: codeText,
        source: resolveProvenance(attributes, safeSources),
        ...metadata,
      });
    }
    const safeText = escapeHtml(codeText);
    return "<pre><code" + (language ? " class=\"language-" + escapeHtml(language) + "\"" : "") + ">" + safeText + "\n</code></pre>";
  };

  const rendered = marked.parse(preparedMarkdown, { async: false, gfm: true, renderer });
  return {
    html: sanitizeHtml(rendered, sanitizeOptions),
    headings,
    hasMedia,
    hasMermaid,
    hasFormula,
  };
}

export function renderSafeMarkdown(markdown, options) {
  return renderSafeMarkdownDocument(markdown, options).html;
}

export function markdownToPlainText(markdown) {
  return plainInline(renderSafeMarkdown(markdown));
}
