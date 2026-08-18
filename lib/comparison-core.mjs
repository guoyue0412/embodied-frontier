export function compareMetric(records, metric) {
  const present = records.filter((record) => typeof record.facts?.[metric]?.value === "number");
  const protocols = new Set(present.map((record) => record.protocol));
  const units = new Set(present.map((record) => record.facts[metric].unit));
  if (protocols.size > 1) return { comparable: false, ranking: [], warning: "评测协议不同，禁止生成跨协议排名。" };
  if (units.size > 1) return { comparable: false, ranking: [], warning: "计量单位不同，禁止生成排名。" };
  return {
    comparable: true,
    ranking: [...present].sort((a, b) => b.facts[metric].value - a.facts[metric].value),
    warning: null,
  };
}
