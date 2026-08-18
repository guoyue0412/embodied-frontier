import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  filtersFromSearchParams,
  filtersToSearchParams,
  searchRecords,
  trackHeadingId,
  type SearchFilters,
  type SearchRecord,
} from "../../lib/search-core.mjs";
import { withBase } from "../../lib/site-path.mjs";
import "../../styles/research-console.css";

type Filters = SearchFilters;
type PaperRecord = Pick<SearchRecord, "slug" | "title" | "summary" | "track" | "venue" | "status" | "tags" | "updated">;

interface PaperExplorerProps {
  papers: PaperRecord[];
  index: SearchRecord[];
  initialFilters?: Filters;
}

const statusLabels: Record<SearchRecord["status"], string> = {
  verified: "已核验",
  "self-reported": "作者自评",
  unverified: "待核",
};

function replaceUrl(filters: Filters) {
  const params = filtersToSearchParams(filters);
  history.replaceState(null, "", params.size ? `${location.pathname}?${params}` : location.pathname);
}

function unique(values: string[]) {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function optionLabel(value: string) {
  return value || "全部";
}

export default function PaperExplorer({ papers, index, initialFilters = {} }: PaperExplorerProps) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const urlFilters = filtersFromSearchParams(new URLSearchParams(window.location.search));
    const frame = window.requestAnimationFrame(() => {
      if (Object.keys(urlFilters).length > 0) setFilters({ ...initialFilters, ...urlFilters });
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialFilters]);

  const tracks = useMemo(() => unique(index.map((record) => record.track)), [index]);
  const tags = useMemo(() => unique(index.flatMap((record) => record.tags)), [index]);
  const years = useMemo(() => unique(index.map((record) => record.year)).sort((a, b) => b.localeCompare(a)), [index]);
  const venues = useMemo(() => unique(index.map((record) => record.venue)), [index]);

  const results = useMemo(() => {
    const matches = new Set(searchRecords(index, filters).map((record) => record.slug));
    return papers.filter((paper) => matches.has(paper.slug));
  }, [filters, index, papers]);

  const groups = useMemo(() => {
    const grouped = new Map<string, PaperRecord[]>();
    for (const paper of results) {
      const group = grouped.get(paper.track) ?? [];
      group.push(paper);
      grouped.set(paper.track, group);
    }
    return [...grouped.entries()];
  }, [results]);

  function updateFilter(key: keyof Filters, value: string) {
    const next = { ...filters };
    if (value) next[key] = value;
    else delete next[key];
    setFilters(next);
    replaceUrl(next);
  }

  function handleSelect(event: ChangeEvent<HTMLSelectElement>) {
    updateFilter(event.currentTarget.name as keyof Filters, event.currentTarget.value);
  }

  function handleQuery(event: ChangeEvent<HTMLInputElement>) {
    updateFilter("query", event.currentTarget.value);
  }

  function clearFilters() {
    setFilters({});
    replaceUrl({});
  }

  return (
    <div className="research-console" data-search-island="paper-explorer" data-hydrated={hydrated ? "true" : "false"}>
      <form className="research-console__filters" data-search-controls="true" hidden={!hydrated} role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="research-console__query">
          <span>全文检索</span>
          <input
            aria-label="全文检索"
            type="search"
            name="query"
            value={filters.query ?? ""}
            onChange={handleQuery}
            placeholder="标题、摘要、正文、标签…"
          />
        </label>
        <label>
          <span>研究方向</span>
          <select name="track" value={filters.track ?? ""} onChange={handleSelect}>
            <option value="">{optionLabel("")}</option>
            {tracks.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>标签</span>
          <select name="tag" value={filters.tag ?? ""} onChange={handleSelect}>
            <option value="">{optionLabel("")}</option>
            {tags.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>年份</span>
          <select name="year" value={filters.year ?? ""} onChange={handleSelect}>
            <option value="">{optionLabel("")}</option>
            {years.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>会议 / 来源</span>
          <select name="venue" value={filters.venue ?? ""} onChange={handleSelect}>
            <option value="">{optionLabel("")}</option>
            {venues.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>证据状态</span>
          <select name="status" value={filters.status ?? ""} onChange={handleSelect}>
            <option value="">{optionLabel("")}</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="research-console__clear" type="button" onClick={clearFilters}>清除筛选</button>
      </form>

      <p className="research-console__count" aria-live="polite" role="status">
        <strong>{results.length}</strong> / {papers.length} 篇匹配
      </p>

      {groups.length > 0 ? groups.map(([track, group]) => (
        <section className="research-console__group" aria-labelledby={trackHeadingId(track)} key={track}>
          <div className="research-console__heading">
            <h2 id={trackHeadingId(track)}>{track}</h2>
            <span>{String(group.length).padStart(2, "0")} RECORDS</span>
          </div>
          <div className="research-console__grid">
            {group.map((paper, index) => {
              const paperUrl = withBase(`/papers/${paper.slug}/`);
              return (
                <article className="paper-card research-console__card" data-paper-slug={paper.slug} key={paper.slug}>
                  <div className="paper-card__top">
                    <span className="paper-card__number">{String(index + 1).padStart(2, "0")}</span>
                    <span className={`evidence evidence--${paper.status}`} data-status={paper.status}>
                      <span className="evidence__dot" aria-hidden="true" />
                      {statusLabels[paper.status]}
                    </span>
                  </div>
                  <div className="paper-card__meta"><span>{paper.track}</span><span>{paper.venue}</span></div>
                  <h3><a href={paperUrl}>{paper.title}</a></h3>
                  <p>{paper.summary}</p>
                  <div className="tag-list" aria-label="论文标签">
                    {paper.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="paper-card__foot">
                    <time dateTime={paper.updated}>更新 {paper.updated}</time>
                    <a href={paperUrl} aria-label={`阅读 ${paper.title}`}>阅读全文 <span aria-hidden="true">→</span></a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )) : (
        <p className="research-console__empty" role="status">没有符合当前筛选条件的论文。</p>
      )}
    </div>
  );
}
