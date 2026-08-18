import type { Metadata } from "next";
import { ProjectCard } from "@/components/project-card";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "项目现场",
  description: "具身智能评测、世界模型和论文雷达项目的证据、状态与下一步。",
};

export default function ProjectsPage() {
  const projects = getProjects();
  return (
    <main id="main-content">
      <header className="page-intro page-shell">
        <span className="eyebrow">ACTIVE RESEARCH</span>
        <h1>让项目状态，<br />落在证据层级上。</h1>
        <p>“已经配置”“正在运行”和“完成验证”不是同一件事。项目页分别记录问题、已有证据与下一步。</p>
      </header>
      <div className="page-section page-shell">
        <div className="project-grid">{projects.map((project) => <ProjectCard key={project.slug} project={project} />)}</div>
      </div>
    </main>
  );
}
