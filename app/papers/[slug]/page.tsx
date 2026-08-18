import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceBadge } from "@/components/evidence-badge";
import { getPaper, getPapers } from "@/lib/content";

type PaperPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPapers().map((paper) => ({ slug: paper.slug }));
}

export async function generateMetadata({ params }: PaperPageProps): Promise<Metadata> {
  const { slug } = await params;
  const paper = getPaper(slug);
  if (!paper) return { title: "论文未找到", robots: { index: false, follow: false } };
  return {
    title: paper.title,
    description: paper.summary,
    openGraph: { title: `${paper.title} · 具身前沿`, description: paper.summary, images: [] },
    twitter: { card: "summary", title: `${paper.title} · 具身前沿`, description: paper.summary, images: [] },
  };
}

export default async function PaperPage({ params }: PaperPageProps) {
  const { slug } = await params;
  const paper = getPaper(slug);
  if (!paper) notFound();

  return (
    <main id="main-content" className="detail-shell">
      <article>
        <header className="detail-header">
          <div className="detail-header__meta">
            <span>{paper.track}</span><span>{paper.venue}</span><time dateTime={paper.date}>{paper.date}</time><EvidenceBadge status={paper.status} />
          </div>
          <h1>{paper.title}</h1>
          <p>{paper.summary}</p>
          <div className="tag-list" aria-label="论文标签">{paper.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </header>
        <div className="prose" dangerouslySetInnerHTML={{ __html: paper.html }} />
      </article>
      <aside className="detail-aside" aria-label="论文资料">
        <section>
          <h2>PRIMARY SOURCES</h2>
          <ul>{paper.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer noopener">{source.label} ↗</a></li>)}</ul>
        </section>
        <section>
          <h2>RECORD</h2>
          <ul>
            <li>首次发布：{paper.date}</li>
            <li>本站更新：{paper.updated}</li>
          </ul>
        </section>
        <Link className="button button--secondary" href="/papers">← 返回论文档案</Link>
      </aside>
    </main>
  );
}
