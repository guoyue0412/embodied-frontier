import matter from "gray-matter";

const evidenceStatuses = new Set(["self-reported"]);
const privateContentPattern = /(?:\b1[3-9]\d{9}\b|@[\w.-]+\.[A-Za-z]{2,}|\/Users\/|\/home\/|private\/|screenshot|智源|道通|BAAI|Colugo|智元|\bA800\b|\bG1\b|\bD455\b|\b(?:70|96\.6|2\.6|76\.6)\s*%?|\b24h\b|<\s*5\s*%)/iu;

function requiredString(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`profile ${field} must be a non-empty string`);
  return value.trim();
}

function stringList(value, field, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`profile ${field} must be a string list with at least ${minimum} item(s)`);
  }
  return value.map((item) => item.trim());
}

function focusRecords(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error("profile focus must include at least one item");
  return value.map((item, index) => ({
    label: requiredString(item?.label, `focus[${index}].label`),
    detail: requiredString(item?.detail, `focus[${index}].detail`),
    tags: stringList(item?.tags, `focus[${index}].tags`),
  }));
}

function capabilityRecords(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error("profile capabilities must include at least one item");
  return value.map((item, index) => ({
    id: requiredString(item?.id, `capabilities[${index}].id`),
    label: requiredString(item?.label, `capabilities[${index}].label`),
    summary: requiredString(item?.summary, `capabilities[${index}].summary`),
    tools: stringList(item?.tools, `capabilities[${index}].tools`),
    evidence: "self-reported",
  }));
}

function practiceRecords(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error("profile practiceLanes must include at least one item");
  return value.map((item, index) => ({
    id: requiredString(item?.id, `practiceLanes[${index}].id`),
    label: requiredString(item?.label, `practiceLanes[${index}].label`),
    detail: requiredString(item?.detail, `practiceLanes[${index}].detail`),
    evidence: "self-reported",
  }));
}

/**
 * Parse the repository-backed public profile and fail closed on private or
 * unsupported resume material before it can reach a generated page.
 */
export function parseProfileMarkdown(source) {
  if (typeof source !== "string" || !source.trim()) throw new Error("profile source must be non-empty Markdown");
  if (privateContentPattern.test(source)) throw new Error("profile source contains private or withheld evidence");
  const { data, content } = matter(source);
  const evidence = requiredString(data.evidence, "evidence");
  if (!evidenceStatuses.has(evidence)) throw new Error("profile evidence must be self-reported");

  return Object.freeze({
    name: requiredString(data.name, "name"),
    eyebrow: requiredString(data.eyebrow, "eyebrow"),
    title: requiredString(data.title, "title"),
    role: requiredString(data.role, "role"),
    summary: requiredString(data.summary, "summary"),
    education: stringList(data.education, "education"),
    evidence,
    sourceLabel: requiredString(data.sourceLabel, "sourceLabel"),
    focus: focusRecords(data.focus),
    honors: stringList(data.honors, "honors"),
    capabilities: capabilityRecords(data.capabilities),
    practiceLanes: practiceRecords(data.practiceLanes),
    body: content.trim(),
  });
}
