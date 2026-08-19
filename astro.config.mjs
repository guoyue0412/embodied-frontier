import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";

const site = process.env.SITE_URL || "https://example.github.io";
const base = process.env.BASE_PATH || "/";

function emitClientManifest() {
  return {
    name: "task-10-client-manifest",
    applyToEnvironment(environment) {
      return environment.name === "client";
    },
    generateBundle(_options, bundle) {
      const manifest = {};
      for (const [file, chunk] of Object.entries(bundle)) {
        if (chunk.type !== "chunk") continue;
        manifest[chunk.facadeModuleId ?? file] = {
          file,
          imports: chunk.imports,
          dynamicImports: chunk.dynamicImports,
          isEntry: chunk.isEntry,
        };
      }
      this.emitFile({ type: "asset", fileName: "astro-manifest.json", source: JSON.stringify(manifest, null, 2) });
    },
  };
}

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
  integrations: [react(), mdx()],
  build: { format: "directory" },
  vite: {
    plugins: [emitClientManifest()],
  },
});
