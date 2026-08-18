import type { Metadata } from "next";
import { EvidenceBadge } from "@/components/evidence-badge";

export const metadata: Metadata = {
  title: "关于与证据约定",
  description: "具身前沿的内容范围、证据语义、修订方式与人工审核规则。",
};

export default function AboutPage() {
  return (
    <main id="main-content">
      <header className="page-intro page-shell">
        <span className="eyebrow">ABOUT THE ARCHIVE</span>
        <h1>宁可保留缺口，<br />也不补全未经证实的结论。</h1>
        <p>具身前沿是一个以 Markdown 和 Git 为事实源的个人研究站，围绕 VLA、世界模型、数据与评测组织内容。</p>
      </header>
      <div className="page-section page-shell about-grid">
        <section className="about-card"><h2>内容流程</h2><p>论文笔记、路线和项目都先写入仓库 Markdown，经字段校验、生产构建和人工审阅后发布。Git 历史保留每次修订。</p></section>
        <section className="about-card"><h2>纠错原则</h2><p>如果来源、数字或评测协议发生变化，修改原条目并保留提交记录。无法确认的内容降级为待核，而不是推测性补全。</p></section>
        <section className="about-card">
          <h2>证据状态</h2>
          <ul>
            <li><EvidenceBadge status="verified" /> 具有可直接核验的一手或独立来源。</li>
            <li><EvidenceBadge status="self-reported" /> 只由作者、实验室或厂商报告。</li>
            <li><EvidenceBadge status="unverified" /> 来源不足或口径尚未确认。</li>
          </ul>
        </section>
        <section className="about-card"><h2>自动研究边界</h2><p>未来的自动流程只负责发现候选、结构化提取和创建 PR。机器人不允许直接合并主分支；每次发布都需要人工审核和构建检查通过。</p></section>
      </div>
    </main>
  );
}
