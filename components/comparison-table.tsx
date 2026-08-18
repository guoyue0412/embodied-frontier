import { EvidenceBadge } from "@/components/evidence-badge";
import type { DatasetRecord, EvidenceFact, ModelRecord } from "@/lib/content/types";

type ComparisonRecord = ModelRecord | DatasetRecord;
type Field = { key: string; label: string; kind?: "fact" | "list" };

const units: Record<string, string> = {
  "billion-parameters": "B 参数", steps: "步", trajectories: "条轨迹", episodes: "段 episode",
  hours: "小时", tasks: "项任务", environments: "个环境", embodiments: "种本体", percent: "%",
};

function factValue(fact?: EvidenceFact) {
  if (!fact || fact.value === null) return <span className="missing-value">暂无可靠值</span>;
  return <>{new Intl.NumberFormat("zh-CN").format(fact.value)} {units[fact.unit] ?? fact.unit}</>;
}

function Cell({ record, field }: { record: ComparisonRecord; field: Field }) {
  if (field.kind === "fact") {
    const fact = record.facts[field.key];
    return <div className="fact-cell"><strong>{factValue(fact)}</strong>{fact && <><EvidenceBadge status={fact.status} /><a href={fact.source} target="_blank" rel="noreferrer noopener">来源 ↗</a></>}</div>;
  }
  const value = record[field.key as keyof ComparisonRecord];
  return <>{Array.isArray(value) ? value.join(" · ") : String(value ?? "—")}</>;
}

export function ComparisonTable({ records, fields, caption }: { records: ComparisonRecord[]; fields: Field[]; caption: string }) {
  return (
    <div className="comparison-wrap">
      <div className="protocol-notice"><strong>对比协议</strong><p>只并列呈现事实字段。协议键不同的记录不会生成跨协议排名；空值明确显示，不以推测补齐。</p></div>
      <table className="comparison-table">
        <caption>{caption} · 字段级证据</caption>
        <thead><tr><th scope="col">记录</th>{fields.map((field) => <th scope="col" key={field.key}>{field.label}</th>)}</tr></thead>
        <tbody>{records.map((record) => <tr key={record.slug}><th scope="row"><strong>{record.title}</strong><small>{record.summary}</small></th>{fields.map((field) => <td key={field.key}><Cell record={record} field={field} /></td>)}</tr>)}</tbody>
      </table>
      <div className="comparison-cards" aria-label={`${caption} · 字段级证据`}>
        {records.map((record) => <article key={record.slug}><h2>{record.title}</h2><p>{record.summary}</p><dl>{fields.map((field) => <div key={field.key}><dt>{field.label}</dt><dd><Cell record={record} field={field} /></dd></div>)}</dl></article>)}
      </div>
    </div>
  );
}
