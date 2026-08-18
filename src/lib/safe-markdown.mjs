import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "h2", "h3", "h4", "p", "ul", "ol", "li", "blockquote", "strong", "em",
  "code", "pre", "a", "hr", "table", "thead", "tbody", "tr", "th", "td",
];

const sanitizeOptions = {
  allowedTags,
  allowedAttributes: {
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    a: ["href", "target", "rel"],
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

export function renderSafeMarkdownDocument(markdown) {
  const headings = [];
  const usedIds = new Set();
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

  const rendered = marked.parse(markdown, { async: false, gfm: true, renderer });
  return {
    html: sanitizeHtml(rendered, sanitizeOptions),
    headings,
  };
}

export function renderSafeMarkdown(markdown) {
  return renderSafeMarkdownDocument(markdown).html;
}

export function markdownToPlainText(markdown) {
  return plainInline(renderSafeMarkdown(markdown));
}
