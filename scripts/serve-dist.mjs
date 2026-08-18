import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";

function normalizeBasePath(value = "/") {
  if (value === "/") return "/";
  return `/${String(value).replace(/^\/+|\/+$/g, "")}/`;
}

const directory = path.resolve(process.env.DIST_DIRECTORY ?? "dist");
const basePath = normalizeBasePath(process.env.BASE_PATH ?? "/");
const port = Number(process.env.DIST_SERVER_PORT ?? process.argv[2] ?? 0);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function routeToFile(requestPath) {
  if (basePath !== "/" && requestPath !== basePath.slice(0, -1) && !requestPath.startsWith(basePath)) return null;
  const relative = basePath === "/" ? requestPath : requestPath.slice(basePath.length - 1) || "/";
  const decoded = decodeURIComponent(relative.split("?", 1)[0]);
  const clean = decoded.replace(/^\/+/, "");
  if (clean.split("/").includes("..")) return null;
  return path.join(directory, clean || "index.html");
}

async function resolveFile(requestPath) {
  const direct = routeToFile(requestPath);
  if (!direct) return null;
  const candidates = [direct];
  if (direct.endsWith(path.sep)) candidates.push(path.join(direct, "index.html"));
  else if (!path.extname(direct)) candidates.push(path.join(direct, "index.html"));
  for (const candidate of candidates) {
    try {
      const resolved = path.resolve(candidate);
      if (!resolved.startsWith(`${directory}${path.sep}`) && resolved !== directory) return null;
      const file = await stat(resolved);
      if (file.isFile()) return resolved;
    } catch { /* try the next route candidate */ }
  }
  return null;
}

const server = http.createServer(async (request, response) => {
  try {
    const file = await resolveFile(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    if (!file) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": contentTypes[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  console.log(`READY ${typeof address === "object" && address ? address.port : port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
