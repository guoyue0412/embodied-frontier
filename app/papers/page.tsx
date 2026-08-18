import type { Metadata } from "next";
import { PaperCard } from "@/components/paper-card";
import { getPapers } from "@/lib/content";

export const metadata: Metadata = {
  title: "论文档案",
  description: "按研究方向浏览具身智能论文笔记，并保留来源与证据状态。",
};

export default function PapersPage() {
  const papers = getPapers();
  const tracks = [...new Set(papers.map((paper) => paper.track))];

  return (
    <main id="main-content">
      <header className="page-intro page-shell">
        <span className="eyebrow">PAPER DOSSIERS</span>
        <h1>论文不是条目，<br />而是一组可核验的主张。</h1>
        <p>按研究方向整理贡献、实现接口、评测协议和证据边界。第二阶段将在此加入本地全文检索与组合筛选。</p>
      </header>
      <div className="page-section page-shell">
        {tracks.map((track) => {
          const records = papers.filter((paper) => paper.track === track);
          return (
            <section key={track} aria-labelledby={`track-${track.replace(/\W/g, "-")}`}>
              <div className="group-heading">
                <h2 id={`track-${track.replace(/\W/g, "-")}`}>{track}</h2>
                <span>{String(records.length).padStart(2, "0")} RECORDS</span>
              </div>
              <div className="paper-grid">
                {records.map((paper, index) => <PaperCard key={paper.slug} paper={paper} index={index + 1} />)}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
