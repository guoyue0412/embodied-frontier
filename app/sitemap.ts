import type { MetadataRoute } from "next";
import { getPapers } from "@/lib/content";
import { getSiteBase } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteBase();
  const staticRoutes = ["", "/papers", "/models", "/datasets", "/graph", "/roadmap", "/projects", "/about"];
  return [
    ...staticRoutes.map((route) => ({ url: new URL(route || "/", base).toString(), lastModified: new Date("2026-08-18") })),
    ...getPapers().map((paper) => ({ url: new URL(`/papers/${paper.slug}`, base).toString(), lastModified: new Date(paper.updated) })),
  ];
}
