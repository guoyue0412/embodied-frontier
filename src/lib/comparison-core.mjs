/**
 * Normalize the small field records used by the comparison table. This module
 * deliberately knows nothing about content fetching: Markdown is compiled
 * into records before this code is called.
 */
function normalizeField(field) {
  if (!field || typeof field !== "object") {
    return { field: "", protocol: "", unit: "", value: null };
  }
  const source = field.fact && typeof field.fact === "object" ? field.fact : field;
  const identity = field.field ?? field.key ?? field.metric;
  const value = source.value;
  return {
    field: typeof identity === "string" ? identity : "",
    protocol: typeof field.protocol === "string" ? field.protocol : "",
    unit: typeof source.unit === "string" ? source.unit : "",
    value: typeof value === "number" && Number.isFinite(value) ? value : null,
  };
}

function fieldList(fields) {
  if (Array.isArray(fields)) return fields.map(normalizeField);
  if (fields && typeof fields === "object") return Object.values(fields).map(normalizeField);
  return [];
}

/**
 * Validate the complete candidate set before considering numeric values.
 * Missing metadata is intentionally incompatible: excluding an incomplete
 * record before validation could turn a heterogeneous comparison into a
 * misleading ranking of the remaining rows.
 */
export function comparisonGate(fields) {
  const normalized = fieldList(fields);
  if (normalized.length < 2) {
    return { compatible: false, reason: "至少需要两条记录，禁止生成排名。" };
  }
  if (normalized.some((field) => !field.field)) {
    return { compatible: false, reason: "字段身份缺失，禁止生成排名。" };
  }
  const fieldKeys = new Set(normalized.map((field) => field.field));
  if (fieldKeys.size > 1) {
    return { compatible: false, reason: "比较字段不同，禁止生成排名。" };
  }
  if (normalized.some((field) => !field.protocol)) {
    return { compatible: false, reason: "协议键缺失，禁止生成排名。" };
  }
  const protocols = new Set(normalized.map((field) => field.protocol));
  if (protocols.size > 1) {
    return { compatible: false, reason: `评测协议不同：${[...protocols].join("、")}，禁止生成跨协议排名。` };
  }
  if (normalized.some((field) => !field.unit)) {
    return { compatible: false, reason: "计量单位缺失，禁止生成排名。" };
  }
  const units = new Set(normalized.map((field) => field.unit));
  if (units.size > 1) {
    return { compatible: false, reason: `计量单位不同：${[...units].join("、")}，禁止生成排名。` };
  }
  return { compatible: true, reason: null, field: normalized[0].field, protocol: normalized[0].protocol, unit: normalized[0].unit };
}

export function canRankFields(fields) {
  return comparisonGate(fields).compatible;
}

export function protocolKeys(records) {
  return [...new Set((records ?? []).map((record) => record?.protocol).filter(Boolean))];
}

export function protocolsCompatible(records) {
  const candidates = (records ?? []).map((record) => ({ field: "__protocol__", protocol: record?.protocol, unit: "__protocol__", value: 1 }));
  return comparisonGate(candidates).compatible;
}

export function protocolMismatch(records) {
  const values = (records ?? []).map((record) => record?.protocol);
  if (values.some((value) => typeof value !== "string" || !value)) return "协议键缺失，禁止生成排名。";
  const protocols = [...new Set(values)];
  if (protocols.length <= 1) return null;
  return `协议键不一致：${protocols.join("、")}。`;
}

export function compareMetric(records, metric) {
  const candidates = (records ?? []).map((record) => {
    const fact = record?.facts?.[metric];
    return {
      record,
      field: metric,
      protocol: record?.protocol,
      unit: fact?.unit,
      value: fact?.value,
    };
  });
  const gate = comparisonGate(candidates);
  if (!gate.compatible) {
    return { comparable: false, ranking: [], warning: gate.reason };
  }
  const present = candidates.filter((candidate) => Number.isFinite(candidate.value));
  if (present.length < 2) {
    return { comparable: false, ranking: [], warning: "可比较的数值字段不足，禁止生成排名。" };
  }
  return {
    comparable: true,
    ranking: present
      .map((candidate) => ({
        ...candidate.record,
        protocol: candidate.protocol,
        value: candidate.value,
        unit: candidate.unit,
      }))
      .sort((a, b) => b.value - a.value),
    warning: null,
  };
}
