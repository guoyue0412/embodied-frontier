import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <strong>具身前沿 · Embodied Frontier</strong>
          <p>把论文、系统与实验整理成可验证的研究坐标。</p>
        </div>
        <div className="site-footer__links">
          <Link href="/papers">论文档案</Link>
          <Link href="/roadmap">研究路线</Link>
          <Link href="/about">证据约定</Link>
        </div>
      </div>
    </footer>
  );
}
