/**
 * Normalize the small field records used by the comparison table.  This
 * module deliberately knows nothing about content fetching: Markdown is
 * compiled into records before this code is called.
 */
function normalizeField(field) {
  if (!field || typeof field !== "object") return null;
  const source = field.fact && typeof field.fact === "object" ? field.fact : field;
  const value = source.value;
  const unit = source.unit;
  const protocol = field.protocol ?? source.protocol;
  return {
    protocol: typeof protocol === "string" ? protocol : "",
    unit: typeof unit === "string" ? unit : "",
    value: typeof value === "number" && Number.isFinite(value) ? value : null,
  };
}

function fieldList(fields) {
  if (Array.isArray(fields)) return fields.map(normalizeField).filter(Boolean);
  if (fields && typeof fields === "object") return Object.values(fields).map(normalizeField).filter(Boolean);
  return [];
}

/**
 * Return true only when at least two fields share one explicit protocol and
 * one unit.  Missing values are allowed here so callers can use the function
 * for a protocol lock; ranking callers must still require numeric values.
 */
export function canRankFields(fields) {
  const normalized = fieldList(fields).filter((field) => field.protocol && field.unit);
  if (normalized.length < 2) return false;
  return new Set(normalized.map((field) => field.protocol)).size === 1
    && new Set(normalized.map((field) => field.unit)).size === 1;
}

export function protocolKeys(records) {
  return [...new Set((records ?? []).map((record) => record?.protocol).filter(Boolean))];
}

export function protocolsCompatible(records) {
  return protocolKeys(records).length <= 1;
}

export function protocolMismatch(records) {
  const protocols = protocolKeys(records);
  if (protocols.length <= 1) return null;
  return `协议键不一致：${protocols.join("、")}。`;
}

export function compareMetric(records, metric) {
  const present = (records ?? [])
    .filter((record) => typeof record?.facts?.[metric]?.value === "number")
    .map((record) => ({
      ...record,
      protocol: record.protocol,
      value: record.facts[metric].value,
      unit: record.facts[metric].unit,
    }));

  if (!canRankFields(present)) {
    const protocols = new Set(present.map((record) => record.protocol));
    const units = new Set(present.map((record) => record.unit));
    let warning = "可比较的数值字段不足，禁止生成排名。";
    if (protocols.size > 1) warning = "评测协议不同，禁止生成跨协议排名。";
    else if (units.size > 1) warning = "计量单位不同，禁止生成排名。";
    return { comparable: false, ranking: [], warning };
  }

  return {
    comparable: true,
    ranking: [...present].sort((a, b) => b.value - a.value),
    warning: null,
  };
}
