import type { MetadataRoute } from "next";
import { getSiteBase } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteBase();
  return { rules: { userAgent: "*", allow: "/" }, sitemap: new URL("/sitemap.xml", base).toString() };
}
