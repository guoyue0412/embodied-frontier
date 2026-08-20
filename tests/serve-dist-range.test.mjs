import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("production test server supports byte-range MP4 metadata requests", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "embodied-frontier-range-"));
  const media = Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz");
  let child;
  try {
    await mkdir(path.join(root, "videos"), { recursive: true });
    await writeFile(path.join(root, "videos", "sample.mp4"), media);
    child = spawn(process.execPath, ["scripts/serve-dist.mjs", "0"], {
      env: { ...process.env, DIST_DIRECTORY: root },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("server did not become ready")), 3000);
      child.stdout.on("data", (chunk) => {
        const match = String(chunk).match(/READY (\d+)/);
        if (!match) return;
        clearTimeout(timer);
        resolve(Number(match[1]));
      });
      child.once("exit", (code) => reject(new Error(`server exited with ${code}: ${stderr}`)));
    });
    const configuredBase = process.env.BASE_PATH && process.env.BASE_PATH !== "/"
      ? `/${process.env.BASE_PATH.replace(/^\/+|\/+$/g, "")}`
      : "";
    const response = await fetch(`http://127.0.0.1:${port}${configuredBase}/videos/sample.mp4`, { headers: { range: "bytes=0-15" } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.equal(response.headers.get("content-range"), `bytes 0-15/${media.length}`);
    assert.equal(response.headers.get("content-length"), "16");
    assert.equal(response.headers.get("content-type"), "video/mp4");
    assert.equal(Buffer.from(await response.arrayBuffer()).toString(), "0123456789abcdef");
  } finally {
    if (child?.exitCode === null) child.kill("SIGTERM");
    await rm(root, { recursive: true, force: true });
  }
});
