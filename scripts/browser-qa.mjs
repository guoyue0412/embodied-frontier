import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import process from "node:process";

const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9333;
const profile = "/tmp/embodied-frontier-browser-qa";
const base = process.env.SITE_URL ?? "http://localhost:3000";

await rm(profile, { recursive: true, force: true });
await mkdir(profile, { recursive: true });

const child = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--disable-background-networking",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

async function waitForJson(path) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError ?? new Error("Chrome DevTools endpoint did not start");
}

try {
  const targets = await waitForJson("/json/list");
  const target = targets.find((candidate) => candidate.type === "page");
  if (!target) throw new Error("No browser page target available");

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  const pageErrors = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") {
      pageErrors.push(message.params.exceptionDetails.text);
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      const { text, url } = message.params.entry;
      if (!url?.includes("/.well-known/appspecific/com.chrome.devtools.json")) {
        pageErrors.push(url ? `${text} (${url})` : text);
      }
    }
  });

  function call(method, params = {}) {
    sequence += 1;
    socket.send(JSON.stringify({ id: sequence, method, params }));
    return new Promise((resolve, reject) => pending.set(sequence, { resolve, reject }));
  }

  async function evaluate(expression) {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  await call("Page.enable");
  await call("Runtime.enable");
  await call("Log.enable");

  const routes = ["/", "/papers", "/papers?q=视觉语言&status=verified", "/papers/openvla", "/models", "/datasets", "/graph", "/roadmap", "/projects", "/about"];
  const viewports = [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 360, height: 800 },
  ];
  const results = [];

  for (const viewport of viewports) {
    await call("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.name === "mobile",
    });
    for (const route of routes) {
      pageErrors.length = 0;
      await call("Page.navigate", { url: `${base}${route}` });
      await new Promise((resolve) => setTimeout(resolve, 800));
      const metrics = await evaluate(`(() => ({
        title: document.title,
        main: Boolean(document.querySelector('main')),
        heading: document.querySelector('h1')?.textContent?.trim() ?? '',
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        clippedHeaderLinks: [...document.querySelectorAll('.site-header a')]
          .filter((link) => { const rect = link.getBoundingClientRect(); return rect.left < 0 || rect.right > window.innerWidth; })
          .map((link) => link.textContent.trim()),
      }))()`);
      results.push({ viewport: viewport.name, route, ...metrics, pageErrors: [...pageErrors] });
    }
  }

  await call("Page.navigate", { url: base });
  await new Promise((resolve) => setTimeout(resolve, 600));
  await evaluate("document.activeElement?.blur()");
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  const keyboard = await evaluate(`(() => {
    const link = document.querySelector('.skip-link');
    const style = getComputedStyle(link);
    return { focused: document.activeElement === link, outlineWidth: style.outlineWidth, transform: style.transform };
  })()`);
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const reducedMotion = await evaluate(`(() => ({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  }))()`);

  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call("Page.navigate", { url: `${base}/papers` });
  await new Promise((resolve) => setTimeout(resolve, 700));
  const searchInteraction = await evaluate(`(async () => {
    const input = document.querySelector('input[type="search"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '视觉语言');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { url: location.search, summary: document.querySelector('.result-summary')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '' };
  })()`);

  await call("Page.navigate", { url: `${base}/graph` });
  await new Promise((resolve) => setTimeout(resolve, 700));
  const loadGraph = await evaluate(`(() => { [...document.querySelectorAll('button')].find((button) => button.textContent.includes('加载关系图'))?.click(); return true; })()`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('.graph-node')];
    buttons.at(-1)?.focus();
    return true;
  })()`);
  await call("Input.dispatchKeyEvent", { type: "rawKeyDown", key: " ", code: "Space", text: " ", unmodifiedText: " ", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const graphInteraction = await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('.graph-node')];
    return { loaded: Boolean(document.querySelector('.knowledge-map')), nodeCount: buttons.length, selected: buttons.at(-1)?.getAttribute('aria-pressed'), focused: document.activeElement === buttons.at(-1) };
  })()`);

  const failures = results.filter((result) => !result.main || !result.heading || result.overflow || result.clippedHeaderLinks.length > 0 || result.pageErrors.length > 0);
  const skipLinkVisible = keyboard.transform === "none" || keyboard.transform === "matrix(1, 0, 0, 1, 0, 0)";
  if (!keyboard.focused || keyboard.outlineWidth === "0px" || !skipLinkVisible || !reducedMotion.matches || reducedMotion.scrollBehavior !== "auto") {
    failures.push({ keyboard, reducedMotion });
  }

  if (!searchInteraction.url.includes("q=%E8%A7%86%E8%A7%89%E8%AF%AD%E8%A8%80") || !searchInteraction.summary.startsWith("2 / 5")) failures.push({ searchInteraction });
  if (!loadGraph || !graphInteraction.loaded || graphInteraction.nodeCount < 3 || graphInteraction.selected !== "true" || !graphInteraction.focused) failures.push({ graphInteraction });

  console.log(JSON.stringify({ results, keyboard, reducedMotion, searchInteraction, graphInteraction, failures }, null, 2));
  socket.close();
  if (failures.length) process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
}
