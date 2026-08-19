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
    span: ["class"],
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

export function renderSafeMarkdownDocument(markdown) {
  const headings = [];
  const usedIds = new Set();
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
    return escaped.replace(/(?<!\\)\$([^$\n]+?)\$(?!\$)|\\\\\(([^\n]+?)\\\\\)/g, (_match, dollarFormula, parenFormula) => {
      hasFormula = true;
      return `<span class="formula-inline" role="math" aria-label="公式">${dollarFormula ?? parenFormula}</span>`;
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
    const language = (lang || "").trim().toLowerCase();
    const safeText = escapeHtml(text.replace(/\n$/, ""));
    if (language === "mermaid") {
      hasMermaid = true;
      return `<div class="mermaid-diagram" role="img" aria-label="Mermaid 研究方向图"><pre><code class="language-mermaid">${safeText}</code></pre></div>`;
    }
    if (["math", "formula", "latex"].includes(language)) {
      hasFormula = true;
      return `<div class="formula-block" role="math" aria-label="公式"><pre><code class="language-math">${safeText}</code></pre></div>`;
    }
    return `<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ""}>${safeText}\n</code></pre>`;
  };

  const rendered = marked.parse(markdown, { async: false, gfm: true, renderer });
  return {
    html: sanitizeHtml(rendered, sanitizeOptions),
    headings,
    hasMedia,
    hasMermaid,
    hasFormula,
  };
}

export function renderSafeMarkdown(markdown) {
  return renderSafeMarkdownDocument(markdown).html;
}

export function markdownToPlainText(markdown) {
  return plainInline(renderSafeMarkdown(markdown));
}
