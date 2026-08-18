import type { ProjectRecord } from "@/lib/content/types";

export function ProjectCard({ project }: { project: ProjectRecord }) {
  return (
    <article className="project-card">
      <div className="project-card__meta"><span>{project.status}</span><time dateTime={project.updated}>{project.updated}</time></div>
      <h3>{project.title}</h3>
      <p className="project-card__question">{project.question}</p>
      <p>{project.summary}</p>
      <dl>
        <div><dt>已形成证据</dt><dd>{project.evidence[0]}</dd></div>
        <div><dt>下一步</dt><dd>{project.next}</dd></div>
      </dl>
    </article>
  );
}
