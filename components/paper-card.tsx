import Link from "next/link";
import type { PaperRecord } from "@/lib/content/types";
import { EvidenceBadge } from "./evidence-badge";

export function PaperCard({ paper, index }: { paper: PaperRecord; index?: number }) {
  return (
    <article className="paper-card">
      <div className="paper-card__top">
        <span className="paper-card__number">{String(index ?? 1).padStart(2, "0")}</span>
        <EvidenceBadge status={paper.status} />
      </div>
      <div className="paper-card__meta"><span>{paper.track}</span><span>{paper.venue}</span></div>
      <h3><Link href={`/papers/${paper.slug}`}>{paper.title}</Link></h3>
      <p>{paper.summary}</p>
      <div className="tag-list" aria-label="论文标签">
        {paper.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
      </div>
      <div className="paper-card__foot">
        <time dateTime={paper.updated}>更新 {paper.updated}</time>
        <Link href={`/papers/${paper.slug}`} aria-label={`阅读 ${paper.title}`}>阅读全文 <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}
