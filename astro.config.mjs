import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";

const site = process.env.SITE_URL || "https://example.github.io";
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
  integrations: [react(), mdx()],
  build: { format: "directory" },
});
