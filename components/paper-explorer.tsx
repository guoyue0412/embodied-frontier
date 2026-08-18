"use client";

import { useMemo, useState } from "react";
import { PaperCard } from "@/components/paper-card";
import type { PaperRecord } from "@/lib/content/types";
import { filtersToSearchParams, searchRecords, type SearchFilters, type SearchRecord } from "@/lib/search-core.mjs";

interface PaperExplorerProps {
  papers: PaperRecord[];
  index: SearchRecord[];
  initialFilters: SearchFilters;
}

const statusLabels = { verified: "已核验", "self-reported": "作者自评", unverified: "待核" };

export function PaperExplorer({ papers, index, initialFilters }: PaperExplorerProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const paperMap = useMemo(() => new Map(papers.map((paper) => [paper.slug, paper])), [papers]);
  const records = useMemo(() => searchRecords(index, filters), [index, filters]);
  const visiblePapers = records.map((record) => paperMap.get(record.slug)).filter((paper): paper is PaperRecord => Boolean(paper));
  const tracks = [...new Set(papers.map((paper) => paper.track))].sort();
  const tags = [...new Set(papers.flatMap((paper) => paper.tags))].sort();
  const years = [...new Set(index.map((record) => record.year))].filter(Boolean).sort().reverse();
  const venues = [...new Set(papers.map((paper) => paper.venue))].sort();

  function update(key: keyof SearchFilters, value: string) {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    const query = filtersToSearchParams(next).toString();
    window.history.replaceState(null, "", query ? `/papers?${query}` : "/papers");
  }

  function clear() {
    setFilters({});
    window.history.replaceState(null, "", "/papers");
  }

  return (
    <div className="paper-explorer">
      <form className="filter-panel" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="filter-query">
          <span>全文检索</span>
          <input aria-label="全文检索" type="search" value={filters.query ?? ""} onChange={(event) => update("query", event.target.value)} placeholder="标题、摘要、正文、标签…" />
        </label>
        <label><span>研究方向</span><select value={filters.track ?? ""} onChange={(event) => update("track", event.target.value)}><option value="">全部</option>{tracks.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>标签</span><select value={filters.tag ?? ""} onChange={(event) => update("tag", event.target.value)}><option value="">全部</option>{tags.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>年份</span><select value={filters.year ?? ""} onChange={(event) => update("year", event.target.value)}><option value="">全部</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>会议 / 来源</span><select value={filters.venue ?? ""} onChange={(event) => update("venue", event.target.value)}><option value="">全部</option>{venues.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>证据状态</span><select value={filters.status ?? ""} onChange={(event) => update("status", event.target.value)}><option value="">全部</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="filter-clear" type="button" onClick={clear}>清除筛选</button>
      </form>

      <div className="result-summary" role="status" aria-live="polite">
        <strong>{visiblePapers.length}</strong> / {papers.length} 篇匹配
      </div>

      {visiblePapers.length ? tracks.map((track) => {
        const group = visiblePapers.filter((paper) => paper.track === track);
        if (!group.length) return null;
        return (
          <section key={track} aria-labelledby={`track-${track.replace(/\W/g, "-")}`}>
            <div className="group-heading"><h2 id={`track-${track.replace(/\W/g, "-")}`}>{track}</h2><span>{String(group.length).padStart(2, "0")} RECORDS</span></div>
            <div className="paper-grid">{group.map((paper, indexNumber) => <PaperCard key={paper.slug} paper={paper} index={indexNumber + 1} />)}</div>
          </section>
        );
      }) : <div className="empty-state"><strong>没有匹配记录</strong><p>缩短关键词或清除一个筛选条件后重试。</p><button className="button" type="button" onClick={clear}>清除筛选</button></div>}
    </div>
  );
}
