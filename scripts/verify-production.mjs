import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { tmpdir } from "node:os";
import { compareBrowserArtifacts } from "./compare-browser-qa.mjs";

const basePath = process.env.BASE_PATH || "/";
const siteUrl = process.env.SITE_URL || "https://example.github.io";

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", ...extraEnv },
    });
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    child.once("error", fail);
    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code ?? signal}`));
    });
  });
}

function waitForExit(child, timeout = 2000) {
  if (!child || child.exitCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    let timer;
    const done = (exited) => {
      clearTimeout(timer);
      child.removeListener("exit", onExit);
      resolve(exited);
    };
    const onExit = () => done(true);
    child.once("exit", onExit);
    timer = setTimeout(() => done(false), timeout);
    timer.unref();
  });
}

async function startDistServer() {
  const child = spawn(process.execPath, ["scripts/serve-dist.mjs", "0"], {
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, BASE_PATH: basePath, ASTRO_TELEMETRY_DISABLED: "1" },
  });
  try {
    const port = await new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => reject(new Error("Timed out waiting for production dist server")), 8000);
      const fail = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      };
      child.once("error", fail);
      child.once("exit", (code, signal) => fail(new Error(`Production dist server exited before READY (${code ?? signal})`)));
      child.stdout.on("data", (chunk) => {
        const match = String(chunk).match(/READY (\d+)/);
        if (!match || settled) return;
        const readyPort = Number(match[1]);
        if (!readyPort) return fail(new Error("Production dist server emitted an invalid port"));
        settled = true;
        clearTimeout(timer);
        resolve(readyPort);
      });
    });
    return { child, port };
  } catch (error) {
    if (child.exitCode === null) child.kill("SIGTERM");
    if (!(await waitForExit(child))) {
      child.kill("SIGKILL");
      if (!(await waitForExit(child))) throw new Error("Production dist server did not exit after SIGKILL");
    }
    throw error;
  }
}

async function stopDistServer(server) {
  if (!server?.child || server.child.exitCode !== null) return;
  server.child.kill("SIGTERM");
  if (await waitForExit(server.child)) return;
  server.child.kill("SIGKILL");
  if (!(await waitForExit(server.child))) throw new Error("Production dist server did not exit after SIGKILL");
}

async function runBrowserQA(serverPort, artifactsDirectory) {
  const localBase = basePath === "/" ? "/" : basePath;
  await run("npm", ["run", "qa:browser"], {
    SITE_URL: `http://127.0.0.1:${serverPort}${localBase}`,
    BROWSER_QA_PORT: "0",
    BROWSER_QA_ARTIFACTS: artifactsDirectory,
  });
}

try {
  await run("npm", ["run", "build"]);
  const testFiles = (await readdir("tests")).filter((file) => file.endsWith(".test.mjs")).toSorted().map((file) => `tests/${file}`);
  await run(process.execPath, ["--test", ...testFiles]);
  await run("npm", ["run", "lint"]);
  await run(process.execPath, ["scripts/check-static-site.mjs", "dist"]);
  await run(process.execPath, ["scripts/check-bundle-budget.mjs", "dist"]);

  let server;
  try {
    server = await startDistServer();
    await runBrowserQA(server.port, "artifacts/browser-qa");
    const repeatDirectory = await mkdtemp(path.join(tmpdir(), "embodied-frontier-browser-qa-repeat-"));
    try {
      await runBrowserQA(server.port, repeatDirectory);
      const repeatability = await compareBrowserArtifacts("artifacts/browser-qa", repeatDirectory);
      console.log(`browser QA repeatability: report ${repeatability.reportSha256}; screenshots ${Object.keys(repeatability.screenshots).length} identical`);
    } finally {
      await rm(repeatDirectory, { recursive: true, force: true });
    }
  } finally {
    await stopDistServer(server);
  }
  console.log(`verify: production build, static, bundle, lint, tests, and browser QA passed (base ${basePath}; source ${siteUrl})`);
} catch (error) {
  console.error(`verify failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
