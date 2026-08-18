import Link from "next/link";

export function ResearchTrackCard({ code, title, question, points }: {
  code: string;
  title: string;
  question: string;
  points: string[];
}) {
  return (
    <article className="track-card">
      <div className="track-card__code">{code}</div>
      <h3>{title}</h3>
      <p>{question}</p>
      <ul>{points.map((point) => <li key={point}>{point}</li>)}</ul>
      <Link href={`/papers?track=${encodeURIComponent(title)}`}>查看研究档案 <span aria-hidden="true">↗</span></Link>
    </article>
  );
}
