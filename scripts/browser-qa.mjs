import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = Number(process.env.BROWSER_QA_PORT ?? 9333);
const profile = process.env.BROWSER_QA_PROFILE ?? "/tmp/embodied-frontier-browser-qa";
const artifactsDirectory = path.resolve(process.env.BROWSER_QA_ARTIFACTS ?? "artifacts/browser-qa");
const siteUrl = new URL(process.env.SITE_URL ?? "http://127.0.0.1:4321/");
const sitePrefix = siteUrl.pathname.replace(/\/+$/g, "");
const routes = ["/", "/papers", "/papers?q=视觉语言&status=verified", "/papers/openvla", "/models", "/datasets", "/graph", "/roadmap", "/projects", "/about"];

function trailingSlash(pathname) {
  const normalized = pathname.replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}/` : "/";
}

function pageUrl(route) {
  const [pathname, query = ""] = route.split("?", 2);
  const routePath = `${sitePrefix}${trailingSlash(pathname)}`;
  return `${siteUrl.origin}${routePath}${query ? `?${query}` : ""}`;
}

function isThreeRequest(url) {
  return /(?:three(?:\.module)?|create-embodiment-scene|griddistortion)/i.test(url);
}

function isCytoscapeRequest(url) {
  return /(?:cytoscape|knowledgemap)/i.test(url);
}

await rm(profile, { recursive: true, force: true });
await rm(artifactsDirectory, { recursive: true, force: true });
await mkdir(profile, { recursive: true });
await mkdir(artifactsDirectory, { recursive: true });

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

async function waitForJson(requestPath) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${requestPath}`);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError ?? new Error("Chrome DevTools endpoint did not start");
}

const report = {
  timestamp: new Date().toISOString(),
  siteUrl: siteUrl.toString(),
  artifactsDirectory,
  profiles: [],
  routeChecks: [],
  assertions: [],
  consoleErrors: [],
  networkEvidence: [],
  screenshots: [],
  failures: [],
};

let socket;
try {
  const targets = await waitForJson("/json/list");
  const target = targets.find((candidate) => candidate.type === "page");
  if (!target) throw new Error("No browser page target available");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  let pageErrors = [];
  let networkRequests = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") pageErrors.push({ type: "exception", text: message.params.exceptionDetails.text });
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      const { text, url } = message.params.entry;
      if (!url?.includes("/.well-known/appspecific/com.chrome.devtools.json")) pageErrors.push({ type: "console", text, url: url ?? "" });
    }
    if (message.method === "Network.requestWillBeSent") networkRequests.push(message.params.request.url);
  });

  function call(method, params = {}) {
    sequence += 1;
    socket.send(JSON.stringify({ id: sequence, method, params }));
    return new Promise((resolve, reject) => pending.set(sequence, { resolve, reject }));
  }

  async function evaluate(expression) {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "Browser expression failed");
    return result.result.value;
  }

  async function waitFor(expression, timeout = 5000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = await evaluate(expression);
      if (value) return value;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return evaluate(expression);
  }

  function check(profileName, route, name, passed, details = {}) {
    const assertion = { profile: profileName, route, name, passed: Boolean(passed), details };
    report.assertions.push(assertion);
    if (!passed) report.failures.push(assertion);
    return Boolean(passed);
  }

  async function configureViewport({ width, height, mobile, reduced }) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
    await call("Emulation.setTouchEmulationEnabled", { enabled: mobile, configuration: "mobile" });
    await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
  }

  async function navigate(route, profileName, options = {}) {
    pageErrors = [];
    networkRequests = [];
    await call("Page.navigate", { url: pageUrl(route) });
    await new Promise((resolve) => setTimeout(resolve, options.wait ?? 800));
    const metrics = await evaluate(`(() => {
      const configuredPrefix = ${JSON.stringify(sitePrefix)};
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const controls = [...document.querySelectorAll('a[href], button, input, select, textarea, summary')].filter(visible);
      const sizes = controls.map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, width: rect.width, height: rect.height, text: element.textContent?.trim().slice(0, 48) ?? '' };
      });
      return {
        title: document.title,
        main: Boolean(document.querySelector('main')),
        heading: document.querySelector('h1')?.textContent?.trim() ?? '',
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        clippedHeaderLinks: [...document.querySelectorAll('.site-header a')].filter((link) => { const rect = link.getBoundingClientRect(); return rect.left < 0 || rect.right > window.innerWidth; }).map((link) => link.textContent.trim()),
        minControlWidth: sizes.length ? Math.min(...sizes.map(({ width }) => width)) : 0,
        minControlHeight: sizes.length ? Math.min(...sizes.map(({ height }) => height)) : 0,
        pathPrefixViolations: [...document.querySelectorAll('a[href^="/"]')].map((link) => link.getAttribute('href')).filter((href) => configuredPrefix && !href.startsWith(configuredPrefix)),
      };
    })()`);
    const record = { profile: profileName, route, viewport: { width: metrics.innerWidth, height: options.height ?? 0 }, assertions: metrics, consoleErrors: [...pageErrors], networkRequests: [...networkRequests] };
    report.routeChecks.push(record);
    report.consoleErrors.push(...pageErrors.map((error) => ({ profile: profileName, route, ...error })));
    report.networkEvidence.push({ profile: profileName, route, requests: [...networkRequests] });
    check(profileName, route, "single main landmark", metrics.main && metrics.heading.length > 0, { main: metrics.main, heading: metrics.heading });
    check(profileName, route, "no horizontal overflow", !metrics.overflow, { scrollWidth: metrics.scrollWidth, innerWidth: metrics.innerWidth });
    check(profileName, route, "header links remain in viewport", metrics.clippedHeaderLinks.length === 0, { clipped: metrics.clippedHeaderLinks });
    check(profileName, route, "no console errors", pageErrors.length === 0, { errors: pageErrors });
    check(profileName, route, "configured base prefixes internal links", metrics.pathPrefixViolations.length === 0, { violations: metrics.pathPrefixViolations });
    return { metrics, requests: [...networkRequests], errors: [...pageErrors] };
  }

  async function screenshot(name) {
    const result = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = path.join(artifactsDirectory, `${name}.png`);
    await writeFile(file, Buffer.from(result.data, "base64"));
    report.screenshots.push(file);
    return file;
  }

  async function runSearch(profileName) {
    const result = await evaluate(`(async () => {
      const input = document.querySelector('input[type="search"]');
      if (!input) throw new Error('搜索控件缺失');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, '视觉语言');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 180));
      return { ok: true, url: location.search, summary: document.querySelector('.research-console__count')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '' };
    })()`);
    check(profileName, "/papers", "search filters update URL and result count", result.ok && result.url.includes("q=") && result.summary.startsWith("2 / 5"), result);
    return result;
  }

  async function runGraph(profileName, route = "/graph") {
    const before = [...networkRequests];
    const clicked = await evaluate(`(() => { const button = document.querySelector('.knowledge-graph__load'); if (!button) return false; button.click(); return true; })()`);
    const ready = await waitFor("document.querySelector('[data-knowledge-map-ready=\"true\"]') && document.querySelectorAll('.knowledge-map__nodes button').length > 0", 6000);
    await evaluate("document.querySelector('.knowledge-map__nodes button')?.click()");
    await new Promise((resolve) => setTimeout(resolve, 120));
    const after = [...networkRequests];
    const graph = await evaluate(`(() => ({
      loaded: Boolean(document.querySelector('[data-knowledge-map-ready="true"]')),
      nodeCount: document.querySelectorAll('.knowledge-map__nodes button').length,
      pathCount: document.querySelectorAll('.knowledge-map__path a').length,
      allTouchSized: [...document.querySelectorAll('.knowledge-map__controls input, .knowledge-map__controls select, .knowledge-map__nodes button')].every((element) => { const rect = element.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44; }),
    }))()`);
    check(profileName, route, "Cytoscape is absent before explicit activation", !before.some(isCytoscapeRequest), { before: before.filter(isCytoscapeRequest) });
    check(profileName, route, "graph loads after explicit activation", clicked && ready && graph.loaded && graph.nodeCount > 0 && graph.pathCount > 0, graph);
    check(profileName, route, "Cytoscape request follows explicit activation", after.some(isCytoscapeRequest), { after: after.filter(isCytoscapeRequest) });
    return { before, after, graph };
  }

  await call("Page.enable");
  await call("Runtime.enable");
  await call("Log.enable");
  await call("Network.enable");

  const desktop = { name: "desktop", viewport: { width: 1440, height: 900 }, reducedMotion: false, touch: false };
  report.profiles.push(desktop);
  await configureViewport({ ...desktop.viewport, mobile: false, reduced: false });
  for (const route of routes) await navigate(route, desktop.name, { height: desktop.viewport.height });
  await navigate("/", desktop.name, { height: desktop.viewport.height });
  const hero = await waitFor("Boolean(document.querySelector('[data-enhanced=\"true\"]'))", 4000);
  check(desktop.name, "/", "hero effects initialize on desktop", Boolean(hero), { enhanced: await evaluate("document.querySelector('[data-static-hero] [data-enhanced]')?.getAttribute('data-enhanced') ?? 'missing'") });
  await screenshot("desktop-home");
  await navigate("/papers", desktop.name, { height: desktop.viewport.height });
  await runSearch(desktop.name);
  await navigate("/graph", desktop.name, { height: desktop.viewport.height });
  const desktopGraph = await runGraph(desktop.name);
  check(desktop.name, "/graph", "desktop graph has visible node/path controls", desktopGraph.graph.allTouchSized && desktopGraph.graph.nodeCount > 0, desktopGraph.graph);
  await screenshot("desktop-graph");

  const mobile = { name: "mobile-touch", viewport: { width: 360, height: 800 }, reducedMotion: false, touch: true };
  report.profiles.push(mobile);
  await configureViewport({ ...mobile.viewport, mobile: true, reduced: false });
  for (const route of routes) {
    const result = await navigate(route, mobile.name, { height: mobile.viewport.height });
    check(mobile.name, route, "all visible controls meet 44px touch target", result.metrics.minControlWidth >= 44 && result.metrics.minControlHeight >= 44, { minWidth: result.metrics.minControlWidth, minHeight: result.metrics.minControlHeight });
    check(mobile.name, route, "Three.js does not download on touch/narrow viewport", !result.requests.some(isThreeRequest), { threeRequests: result.requests.filter(isThreeRequest) });
  }
  await screenshot("mobile-home");
  await navigate("/graph", mobile.name, { height: mobile.viewport.height });
  const graphMobile = await runGraph(mobile.name);
  check(mobile.name, "/graph", "activated graph controls meet 44px touch target", graphMobile.graph.allTouchSized, graphMobile.graph);

  const reduced = { name: "desktop-reduced-motion", viewport: { width: 1440, height: 900 }, reducedMotion: true, touch: false };
  report.profiles.push(reduced);
  await configureViewport({ ...reduced.viewport, mobile: false, reduced: true });
  await navigate("/", reduced.name, { height: reduced.viewport.height });
  const reducedState = await evaluate(`(() => {
    const staticArt = document.querySelector('.hero__static-art');
    const heroLayer = document.querySelector('[data-motion-only="true"]');
    const animationStyles = [...document.querySelectorAll('*')].map((element) => getComputedStyle(element)).filter((style) => style.animationName !== 'none');
    return {
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      staticVisible: Boolean(staticArt && getComputedStyle(staticArt).display !== 'none' && getComputedStyle(staticArt).visibility !== 'hidden'),
      enhanced: document.querySelector('[data-static-hero] [data-enhanced]')?.getAttribute('data-enhanced') ?? 'missing',
      motionLayerHidden: Boolean(heroLayer && getComputedStyle(heroLayer).display === 'none'),
      continuousAnimations: animationStyles.length,
    };
  })()`);
  check(reduced.name, "/", "reduced-motion keeps static hero visible", reducedState.matches && reducedState.staticVisible && reducedState.motionLayerHidden && reducedState.enhanced !== "true", reducedState);
  check(reduced.name, "/", "reduced-motion has no continuous animations", reducedState.continuousAnimations === 0, reducedState);
  await screenshot("reduced-motion-home");
  await navigate("/papers", reduced.name, { height: reduced.viewport.height });
  await runSearch(reduced.name);
  await navigate("/papers/openvla", reduced.name, { height: reduced.viewport.height });
  const reading = await evaluate(`(() => {
    const article = document.querySelector('.detail-shell article');
    const button = document.querySelector('.evidence-lens__button[data-lens="verified"]');
    if (!article || !button) return { ok: false };
    button.click();
    const prose = document.querySelector('.prose');
    return { ok: article.getAttribute('data-evidence-lens') === 'verified' && Boolean(prose && prose.textContent.trim().length > 80), proseVisible: Boolean(prose && getComputedStyle(prose).display !== 'none') };
  })()`);
  check(reduced.name, "/papers/openvla", "reduced-motion keeps reading tools usable", reading.ok && reading.proseVisible, reading);
  await navigate("/graph", reduced.name, { height: reduced.viewport.height });
  const reducedGraph = await runGraph(reduced.name);
  check(reduced.name, "/graph", "reduced-motion keeps graph usable", reducedGraph.graph.loaded && reducedGraph.graph.nodeCount > 0, reducedGraph.graph);
  await screenshot("reduced-motion-graph");

  await call("Emulation.setScriptExecutionDisabled", { value: true });
  await navigate("/papers", "no-javascript", { height: 800, wait: 500 });
  const noJsPapers = await evaluate(`(() => ({ cards: document.querySelectorAll('.paper-card').length, filtersPresent: Boolean(document.querySelector('[data-search-controls]')), fallback: /完整论文列表/.test(document.body.textContent) }))()`);
  check("no-javascript", "/papers", "static paper list remains usable without JavaScript", noJsPapers.cards >= 5 && noJsPapers.filtersPresent && noJsPapers.fallback, noJsPapers);
  await navigate("/graph", "no-javascript", { height: 800, wait: 500 });
  const noJsGraph = await evaluate(`(() => ({ relationshipList: document.querySelectorAll('.relationship-list details').length, fallback: /完整关系清单/.test(document.body.textContent) }))()`);
  check("no-javascript", "/graph", "static graph relationship list remains usable without JavaScript", noJsGraph.relationshipList >= 1 && noJsGraph.fallback, noJsGraph);
  await call("Emulation.setScriptExecutionDisabled", { value: false });

  if (report.failures.length) process.exitCode = 1;
} catch (error) {
  report.failures.push({ fatal: error instanceof Error ? error.message : String(error) });
  console.error(error);
  process.exitCode = 1;
} finally {
  try {
    await writeFile(path.join(artifactsDirectory, "report.json"), JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(`Could not write browser QA report: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
  socket?.close();
  child.kill("SIGTERM");
  console.log(JSON.stringify(report, null, 2));
}
