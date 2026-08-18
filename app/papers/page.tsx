import type { Metadata } from "next";
import { PaperExplorer } from "@/components/paper-explorer";
import { getPapers } from "@/lib/content";
import { getSearchIndex } from "@/lib/search-index";
import type { SearchFilters } from "@/lib/search-core.mjs";

export const metadata: Metadata = {
  title: "论文档案",
  description: "按研究方向浏览具身智能论文笔记，并保留来源与证据状态。",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PapersPage({ searchParams }: { searchParams: SearchParams }) {
  const papers = getPapers();
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] : undefined;
  const initialFilters: SearchFilters = {
    query: value("q"), track: value("track"), tag: value("tag"), year: value("year"), venue: value("venue"), status: value("status"),
  };

  return (
    <main id="main-content">
      <header className="page-intro page-shell">
        <span className="eyebrow">PAPER DOSSIERS</span>
        <h1>论文不是条目，<br />而是一组可核验的主张。</h1>
        <p>按研究方向整理贡献、实现接口、评测协议和证据边界。检索与筛选全部在本地执行，并可通过 URL 恢复。</p>
      </header>
      <div className="page-section page-shell">
        <PaperExplorer papers={papers} index={getSearchIndex()} initialFilters={initialFilters} />
      </div>
    </main>
  );
}
