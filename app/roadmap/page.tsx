import type { Metadata } from "next";
import Link from "next/link";
import { getPaper, getRoadmap } from "@/lib/content";

export const metadata: Metadata = {
  title: "研究路线",
  description: "从基础坐标、核心系统到前沿问题的具身智能学习与研究路线。",
};

export default function RoadmapPage() {
  const roadmap = getRoadmap();
  return (
    <main id="main-content">
      <header className="page-intro page-shell">
        <span className="eyebrow">RESEARCH ROADMAP</span>
        <h1>学习路线的终点，<br />是能设计验证实验。</h1>
        <p>每一阶段都明确目标与输出。阅读只是输入，真实完成信号来自代码、运行、指标和可解释的失败案例。</p>
      </header>
      <div className="page-section page-shell roadmap-full">
        {roadmap.map((stage) => (
          <section className="roadmap-stage" key={stage.slug}>
            <div className="roadmap-stage__number">{String(stage.order).padStart(2, "0")}</div>
            <div>
              <span className="roadmap-stage__meta">{stage.label} · {stage.duration}</span>
              <h2>{stage.title}</h2>
              <p>{stage.summary}</p>
              <div className="roadmap-columns">
                <div><h3>目标</h3><ul>{stage.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul></div>
                <div><h3>完成信号</h3><ul>{stage.outputs.map((output) => <li key={output}>{output}</li>)}</ul></div>
              </div>
              <div className="tag-list" aria-label="推荐阅读">
                {stage.reading.map((slug) => {
                  const paper = getPaper(slug);
                  return paper ? <Link key={slug} href={`/papers/${slug}`}>{paper.title} ↗</Link> : null;
                })}
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
