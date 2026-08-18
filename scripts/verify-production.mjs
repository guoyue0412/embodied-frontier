import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readdir } from "node:fs/promises";
import process from "node:process";

const basePath = process.env.BASE_PATH || "/";
const siteUrl = process.env.SITE_URL || "https://example.github.io";

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", ...extraEnv },
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code ?? signal}`));
    });
  });
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function startDistServer() {
  const child = spawn(process.execPath, ["scripts/serve-dist.mjs", "0"], {
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, BASE_PATH: basePath, ASTRO_TELEMETRY_DISABLED: "1" },
  });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for production dist server")), 8000);
    child.once("error", reject);
    child.stdout.on("data", (chunk) => {
      const match = String(chunk).match(/READY (\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
  });
  return { child, port };
}

function stopDistServer(server) {
  if (!server?.child || server.child.exitCode !== null) return;
  server.child.kill("SIGTERM");
}

try {
  await run("npm", ["run", "build"]);
  const testFiles = (await readdir("tests")).filter((file) => file.endsWith(".test.mjs")).toSorted().map((file) => `tests/${file}`);
  await run(process.execPath, ["--test", ...testFiles]);
  await run("npm", ["run", "lint"]);
  await run(process.execPath, ["scripts/check-static-site.mjs", "dist"]);
  await run(process.execPath, ["scripts/check-bundle-budget.mjs", "dist"]);

  const server = await startDistServer();
  try {
    const browserPort = await freePort();
    const localBase = basePath === "/" ? "/" : basePath;
    await run("npm", ["run", "qa:browser"], {
      SITE_URL: `http://127.0.0.1:${server.port}${localBase}`,
      BROWSER_QA_PORT: String(browserPort),
      BROWSER_QA_ARTIFACTS: "artifacts/browser-qa",
    });
  } finally {
    stopDistServer(server);
  }
  console.log(`verify: production build, static, bundle, lint, tests, and browser QA passed (base ${basePath}; source ${siteUrl})`);
} catch (error) {
  console.error(`verify failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
