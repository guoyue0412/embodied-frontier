import Link from "next/link";

const navigation = [
  { href: "/papers", label: "论文" },
  { href: "/models", label: "模型" },
  { href: "/datasets", label: "数据" },
  { href: "/graph", label: "图谱" },
  { href: "/roadmap", label: "路线" },
  { href: "/projects", label: "项目" },
  { href: "/about", label: "关于" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="wordmark" href="/" aria-label="具身前沿首页">
          <span className="wordmark__mark" aria-hidden="true">EF</span>
          <span><strong>具身前沿</strong><small>EMBODIED FRONTIER</small></span>
        </Link>
        <nav aria-label="主导航">
          {navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
      </div>
    </header>
  );
}
