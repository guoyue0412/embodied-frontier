import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteBase } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const base = await getSiteBase();
  const image = new URL("/og.png", base).toString();
  const description = "以证据为坐标的具身智能研究站：VLA、世界模型、数据与评测。";
  return {
    title: { default: "具身前沿", template: "%s · 具身前沿" },
    description,
    metadataBase: base,
    icons: { icon: "/favicon.svg" },
    openGraph: { title: "具身前沿 · Embodied Frontier", description, images: [{ url: image, width: 1730, height: 909, alt: "具身前沿研究坐标" }] },
    twitter: { card: "summary_large_image", title: "具身前沿 · Embodied Frontier", description, images: [image] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main-content">跳到正文</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
