import type { Metadata } from "next";
import Link from "next/link";
import { EvidenceBadge } from "@/components/evidence-badge";
import { PaperCard } from "@/components/paper-card";
import { ProjectCard } from "@/components/project-card";
import { ResearchTrackCard } from "@/components/research-track-card";
import { SectionHeading } from "@/components/section-heading";
import { getPapers, getProjects, getRoadmap } from "@/lib/content";
import type { EvidenceStatus } from "@/lib/content/types";

export const metadata: Metadata = {
  title: "具身智能研究坐标",
  description: "从 VLA、世界模型到数据与评测，以来源、协议和实验边界组织具身智能研究。",
};

const tracks = [
  { code: "01 / VLA", title: "VLA", question: "视觉与语言如何转化为稳定、可泛化的机器人动作？", points: ["动作 token 与连续动作块", "通用预训练与下游适配", "快慢系统与闭环控制"] },
  { code: "02 / WAM", title: "WAM", question: "预测未来是否真的能够改善动作选择与长时程规划？", points: ["像素未来与潜空间未来", "世界—动作联合建模", "预测指标与任务成功率"] },
  { code: "03 / DATA", title: "Data & Eval", question: "什么数据和评测能够支持可信的机器人学习结论？", points: ["数据覆盖与泄漏边界", "同协议基准比较", "失败案例与可追溯证据"] },
];

const evidenceCopy: Array<{ status: EvidenceStatus; copy: string }> = [
  { status: "verified", copy: "论文、官方项目页或独立来源可以直接核验。" },
  { status: "self-reported", copy: "能力或指标仅由作者、实验室或厂商报告。" },
  { status: "unverified", copy: "来源不足、口径不清或仍等待进一步确认。" },
];

export default function Home() {
  const papers = getPapers();
  const roadmap = getRoadmap();
  const projects = getProjects();

  return (
    <main id="main-content">
      <section className="hero page-shell">
        <div className="hero__copy">
          <span className="eyebrow">EMBODIED INTELLIGENCE · FIELD NOTES</span>
          <h1>把具身智能研究，<br />整理成可验证的坐标。</h1>
          <p>不追逐链接数量。沿 VLA、世界模型、数据与评测三条主线，记录来源、协议、实验边界与仍未解决的问题。</p>
          <div className="hero__actions">
            <Link className="button button--primary" href="/papers">进入论文档案 <span aria-hidden="true">→</span></Link>
            <Link className="button button--secondary" href="/roadmap">查看研究路线</Link>
          </div>
        </div>
        <aside className="hero__ledger" aria-label="站点研究概况">
          <div className="ledger-label">CURRENT INDEX · 2026</div>
          <dl>
            <div><dt>研究主线</dt><dd>03</dd></div>
            <div><dt>论文笔记</dt><dd>{String(papers.length).padStart(2, "0")}</dd></div>
            <div><dt>项目现场</dt><dd>{String(projects.length).padStart(2, "0")}</dd></div>
          </dl>
          <p><span aria-hidden="true">●</span> 内容来自仓库 Markdown，修改记录由 Git 保留。</p>
        </aside>
      </section>

      <section className="section section--ink">
        <div className="page-shell">
          <SectionHeading index="01" eyebrow="RESEARCH RADAR" title="沿问题，而不是发布日期浏览。">每条主线都从真实研究问题进入，再回到论文、系统和实验。</SectionHeading>
          <div className="track-grid">{tracks.map((track) => <ResearchTrackCard key={track.code} {...track} />)}</div>
        </div>
      </section>

      <section className="section page-shell">
        <SectionHeading index="02" eyebrow="LATEST NOTES" title="最近更新的论文坐标。">先说明证据边界，再讨论贡献、性能与适用范围。</SectionHeading>
        <div className="paper-grid">{papers.slice(0, 3).map((paper, index) => <PaperCard key={paper.slug} paper={paper} index={index + 1} />)}</div>
        <div className="section-link"><Link href="/papers">查看全部 {papers.length} 篇笔记 <span aria-hidden="true">→</span></Link></div>
      </section>

      <section className="section section--soft">
        <div className="page-shell">
          <SectionHeading index="03" eyebrow="LEARNING PATH" title="从读懂系统，到提出可证伪问题。">每一阶段都要求留下可检查的输出，而不是完成一份阅读清单。</SectionHeading>
          <ol className="roadmap-preview">
            {roadmap.map((stage) => (
              <li key={stage.slug}>
                <div className="roadmap-preview__number">{String(stage.order).padStart(2, "0")}</div>
                <div><span>{stage.label} · {stage.duration}</span><h3>{stage.title}</h3><p>{stage.summary}</p></div>
                <Link href="/roadmap" aria-label={`查看${stage.title}`}>↗</Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section page-shell">
        <SectionHeading index="04" eyebrow="KNOWLEDGE TOOLS" title="从检索，到可解释的关系。">全文索引、字段级对比与显式知识关系都由仓库内容在构建时生成。</SectionHeading>
        <div className="tool-grid">
          <Link href="/papers"><span>01 / SEARCH</span><h3>检索论文档案</h3><p>组合关键词、方向、标签、年份、来源与证据状态。</p><b>进入检索 →</b></Link>
          <Link href="/models"><span>02 / COMPARE</span><h3>模型与数据集对比</h3><p>逐字段显示单位、来源和可信度，不制造跨协议排名。</p><b>查看模型 →</b></Link>
          <Link href="/graph"><span>03 / GRAPH</span><h3>浏览知识关系</h3><p>从论文连接到模型与数据集，并保留完整列表等价视图。</p><b>打开图谱 →</b></Link>
        </div>
      </section>

      <section className="section section--soft">
        <div className="page-shell">
        <SectionHeading index="05" eyebrow="ACTIVE WORK" title="研究发生在可复现的现场。">区分已经形成的证据、当前推断和下一步实验。</SectionHeading>
        <div className="project-grid">{projects.slice(0, 2).map((project) => <ProjectCard key={project.slug} project={project} />)}</div>
        <div className="section-link"><Link href="/projects">进入全部项目 <span aria-hidden="true">→</span></Link></div>
        </div>
      </section>

      <section className="section section--evidence">
        <div className="page-shell evidence-panel">
          <div><span className="eyebrow">EVIDENCE FIRST</span><h2>可信度不是装饰标签，<br />而是每条结论的边界。</h2></div>
          <div className="evidence-list">
            {evidenceCopy.map((item) => <div key={item.status}><EvidenceBadge status={item.status} /><p>{item.copy}</p></div>)}
          </div>
        </div>
      </section>
    </main>
  );
}
