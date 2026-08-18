import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export const evidenceStatuses = ["verified", "self-reported", "unverified"];
const evidenceStatusSet = new Set(evidenceStatuses);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const factUnits = new Set(["billion-parameters", "steps", "trajectories", "episodes", "hours", "tasks", "environments", "embodiments", "percent"]);

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

function requiredString(data, field, file) {
  const value = data[field];
  if (typeof value !== "string" || !value.trim()) fail(file, `${field} is required`);
  return value.trim();
}

function stringArray(data, field, file, { min = 0 } = {}) {
  const value = data[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail(file, `${field} must be a string array`);
  }
  if (value.length < min) fail(file, `${field} must include at least ${min} item(s)`);
  return value.map((item) => item.trim());
}

function isoDate(data, field, file) {
  const value = requiredString(data, field, file);
  if (!isRealCalendarDate(value)) {
    fail(file, `${field} must be YYYY-MM-DD`);
  }
  return value;
}

function isRealCalendarDate(value) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

function slug(data, file) {
  const value = requiredString(data, "slug", file);
  if (!slugPattern.test(value)) fail(file, "slug must use lowercase words separated by hyphens");
  return value;
}

function sources(data, file) {
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    fail(file, "sources must include at least one item");
  }
  return data.sources.map((source, index) => {
    if (!source || typeof source !== "object") fail(file, `sources[${index}] must be an object`);
    const label = requiredString(source, "label", `${file} sources[${index}]`);
    const url = requiredString(source, "url", `${file} sources[${index}]`);
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      fail(file, `sources[${index}].url must be a valid URL`);
    }
    if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
      fail(file, `sources[${index}].url must use http or https`);
    }
    return { label, url: parsed.toString() };
  });
}

function httpUrl(value, field, file) {
  if (typeof value !== "string" || !value.trim()) fail(file, `${field} is required`);
  let parsed;
  try { parsed = new URL(value); } catch { fail(file, `${field} must be a valid URL`); }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) fail(file, `${field} must use http or https`);
  return parsed.toString();
}

function relations(data, file) {
  if (!Array.isArray(data.relations)) fail(file, "relations must be an array");
  return data.relations.map((relation, index) => {
    if (!relation || typeof relation !== "object") fail(file, `relations[${index}] must be an object`);
    return {
      target: requiredString(relation, "target", `${file} relations[${index}]`),
      type: requiredString(relation, "type", `${file} relations[${index}]`),
    };
  });
}

function facts(data, file) {
  if (!data.facts || typeof data.facts !== "object" || Array.isArray(data.facts)) fail(file, "facts must be an object");
  return Object.fromEntries(Object.entries(data.facts).map(([name, fact]) => {
    if (!fact || typeof fact !== "object" || Array.isArray(fact)) fail(file, `facts.${name} must be an object`);
    if (!(typeof fact.value === "number" || fact.value === null)) fail(file, `facts.${name}.value must be a number or null`);
    const unit = requiredString(fact, "unit", `${file} facts.${name}`);
    if (!factUnits.has(unit)) fail(file, `facts.${name} has unsupported unit ${unit}`);
    const status = requiredString(fact, "status", `${file} facts.${name}`);
    if (!evidenceStatusSet.has(status)) fail(file, `facts.${name}.status must be one of ${evidenceStatuses.join(", ")}`);
    return [name, { value: fact.value, unit, status, source: httpUrl(fact.source, `facts.${name}.source`, file) }];
  }));
}

function safeMarkdown(markdown) {
  const rendered = marked.parse(markdown, { async: false, gfm: true });
  return sanitizeHtml(rendered, {
    allowedTags: [
      "h2", "h3", "h4", "p", "ul", "ol", "li", "blockquote", "strong", "em",
      "code", "pre", "a", "hr", "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, target: "_blank", rel: "noreferrer noopener" },
      }),
    },
  });
}

function plainText(markdown) {
  const rendered = marked.parse(markdown, { async: false, gfm: true });
  return sanitizeHtml(rendered, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}

function parsePaper(data, content, file) {
  const status = requiredString(data, "status", file);
  if (!evidenceStatusSet.has(status)) {
    fail(file, `status must be one of ${evidenceStatuses.join(", ")}`);
  }
  return {
    type: "paper",
    title: requiredString(data, "title", file),
    slug: slug(data, file),
    date: isoDate(data, "date", file),
    updated: isoDate(data, "updated", file),
    track: requiredString(data, "track", file),
    venue: requiredString(data, "venue", file),
    status,
    tags: stringArray(data, "tags", file, { min: 1 }),
    summary: requiredString(data, "summary", file),
    sources: sources(data, file),
    relations: Array.isArray(data.relations) ? relations(data, file) : [],
    text: plainText(content),
    html: safeMarkdown(content),
  };
}

function parseModel(data, content, file) {
  return {
    type: "model",
    title: requiredString(data, "title", file),
    slug: slug(data, file),
    updated: isoDate(data, "updated", file),
    family: requiredString(data, "family", file),
    organization: requiredString(data, "organization", file),
    license: requiredString(data, "license", file),
    protocol: requiredString(data, "protocol", file),
    summary: requiredString(data, "summary", file),
    inputs: stringArray(data, "inputs", file, { min: 1 }),
    outputs: stringArray(data, "outputs", file, { min: 1 }),
    facts: facts(data, file),
    relations: relations(data, file),
    html: safeMarkdown(content),
  };
}

function parseDataset(data, content, file) {
  return {
    type: "dataset",
    title: requiredString(data, "title", file),
    slug: slug(data, file),
    updated: isoDate(data, "updated", file),
    organization: requiredString(data, "organization", file),
    license: requiredString(data, "license", file),
    protocol: requiredString(data, "protocol", file),
    summary: requiredString(data, "summary", file),
    modalities: stringArray(data, "modalities", file, { min: 1 }),
    facts: facts(data, file),
    relations: relations(data, file),
    html: safeMarkdown(content),
  };
}

function parseRoadmap(data, content, file) {
  const order = Number(data.order);
  if (!Number.isInteger(order) || order < 1) fail(file, "order must be a positive integer");
  return {
    type: "roadmap",
    title: requiredString(data, "title", file),
    slug: slug(data, file),
    order,
    label: requiredString(data, "label", file),
    duration: requiredString(data, "duration", file),
    summary: requiredString(data, "summary", file),
    goals: stringArray(data, "goals", file, { min: 1 }),
    outputs: stringArray(data, "outputs", file, { min: 1 }),
    reading: stringArray(data, "reading", file, { min: 1 }),
    html: safeMarkdown(content),
  };
}

function parseProject(data, content, file) {
  return {
    type: "project",
    title: requiredString(data, "title", file),
    slug: slug(data, file),
    updated: isoDate(data, "updated", file),
    status: requiredString(data, "status", file),
    question: requiredString(data, "question", file),
    summary: requiredString(data, "summary", file),
    evidence: stringArray(data, "evidence", file, { min: 1 }),
    next: requiredString(data, "next", file),
    html: safeMarkdown(content),
  };
}

const parsers = { papers: parsePaper, roadmap: parseRoadmap, projects: parseProject, models: parseModel, datasets: parseDataset };

async function markdownFiles(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error?.code === "ENOENT") return []; throw error; }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

export async function compileContent({ contentDir, outputFile }) {
  const result = { papers: [], roadmap: [], projects: [], models: [], datasets: [] };
  const slugs = new Map();

  for (const [section, parser] of Object.entries(parsers)) {
    for (const file of await markdownFiles(path.join(contentDir, section))) {
      const raw = await readFile(file, "utf8");
      const { data, content } = matter(raw);
      const record = parser(data, content, path.relative(contentDir, file));
      const key = `${section}:${record.slug}`;
      if (slugs.has(key)) fail(path.relative(contentDir, file), `duplicate slug ${record.slug}`);
      slugs.set(key, file);
      result[section].push(record);
    }
  }

  result.papers.sort((a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title));
  result.roadmap.sort((a, b) => a.order - b.order);
  result.projects.sort((a, b) => b.updated.localeCompare(a.updated));
  result.models.sort((a, b) => a.title.localeCompare(b.title));
  result.datasets.sort((a, b) => a.title.localeCompare(b.title));

  const payload = { ...result, generatedAt: new Date().toISOString() };
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}
