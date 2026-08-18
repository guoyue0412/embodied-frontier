import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const resolvedChrome = await (async () => {
  for (const candidate of chromeCandidates) {
    try { await access(candidate); return candidate; } catch { /* try the next installed browser */ }
  }
  throw new Error(`No Chrome/Chromium executable found; checked ${chromeCandidates.join(", ")}`);
})();
const requestedPort = Number(process.env.BROWSER_QA_PORT ?? 0);
const profile = process.env.BROWSER_QA_PROFILE ?? "/tmp/embodied-frontier-browser-qa";
const artifactsDirectory = path.resolve(process.env.BROWSER_QA_ARTIFACTS ?? "artifacts/browser-qa");
const siteUrl = new URL(process.env.SITE_URL ?? "http://127.0.0.1:4321/");
const sitePrefix = siteUrl.pathname.replace(/\/+$/g, "");
const routes = ["/", "/papers", "/papers?q=视觉语言&status=verified", "/papers/openvla", "/models", "/datasets", "/graph", "/roadmap", "/projects", "/about"];

async function allocatePort() {
  if (requestedPort > 0) return requestedPort;
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

const port = await allocatePort();

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

function portableUrl(value) {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return String(value).replace(/^https?:\/\/[^/]+/i, "");
  }
}

function portablePath(value) {
  return path.relative(process.cwd(), value).replace(/\\/g, "/");
}

function portableRequests(values) {
  return values.map(portableUrl).toSorted();
}

await rm(profile, { recursive: true, force: true });
await rm(artifactsDirectory, { recursive: true, force: true });
await mkdir(profile, { recursive: true });
await mkdir(artifactsDirectory, { recursive: true });

const child = spawn(resolvedChrome, [
  "--headless=new",
  "--disable-gpu",
  "--disable-background-networking",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

async function waitForJson(requestPath, browserProcess) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (browserProcess.exitCode !== null) throw new Error(`Chrome exited before DevTools became ready (${browserProcess.exitCode})`);
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

function waitForExit(processHandle, timeout = 2000) {
  if (!processHandle || processHandle.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    let timer;
    const done = () => {
      clearTimeout(timer);
      processHandle.removeListener("exit", done);
      resolve();
    };
    processHandle.once("exit", done);
    timer = setTimeout(() => {
      if (processHandle.exitCode === null) processHandle.kill("SIGKILL");
      done();
    }, timeout);
    timer.unref();
  });
}

const report = {
  schemaVersion: 2,
  siteBasePath: sitePrefix || "/",
  artifactsDirectory: "artifacts/browser-qa",
  profiles: [],
  routeChecks: [],
  assertions: [],
  consoleErrors: [],
  networkEvidence: [],
  resourceFailures: [],
  screenshots: [],
  failures: [],
};

let socket;
try {
  const targets = await waitForJson("/json/list", child);
  const target = targets.find((candidate) => candidate.type === "page");
  if (!target) throw new Error("No browser page target available");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  let activeCapture = null;
  function createCapture(route, profileName) {
    return {
      route,
      profileName,
      loaderId: null,
      pageErrors: [],
      requests: [],
      requestUrls: new Map(),
      pendingRequests: new Set(),
      resourceFailures: [],
      httpErrors: [],
      lastNetworkEventAt: Date.now(),
    };
  }
  function currentCaptureAccepts(params) {
    if (!activeCapture) return false;
    return !activeCapture.loaderId || !params.loaderId || params.loaderId === activeCapture.loaderId;
  }
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown" && activeCapture) activeCapture.pageErrors.push({ type: "exception", text: message.params.exceptionDetails.text });
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      const { text, url } = message.params.entry;
      if (activeCapture && !url?.includes("/.well-known/appspecific/com.chrome.devtools.json")) activeCapture.pageErrors.push({ type: "console", text, url: url ?? "" });
    }
    if (message.method === "Network.requestWillBeSent" && currentCaptureAccepts(message.params)) {
      activeCapture.requests.push(message.params.request.url);
      activeCapture.requestUrls.set(message.params.requestId, message.params.request.url);
      activeCapture.pendingRequests.add(message.params.requestId);
      activeCapture.lastNetworkEventAt = Date.now();
    }
    if (message.method === "Network.loadingFinished" && activeCapture?.requestUrls.has(message.params.requestId)) {
      activeCapture.pendingRequests.delete(message.params.requestId);
      activeCapture.lastNetworkEventAt = Date.now();
    }
    if (message.method === "Network.loadingFailed" && activeCapture?.requestUrls.has(message.params.requestId)) {
      activeCapture.pendingRequests.delete(message.params.requestId);
      activeCapture.resourceFailures.push({ url: activeCapture.requestUrls.get(message.params.requestId) ?? "<unknown>", error: message.params.errorText, canceled: message.params.canceled === true });
      activeCapture.lastNetworkEventAt = Date.now();
    }
    if (message.method === "Network.responseReceived" && currentCaptureAccepts(message.params) && message.params.response.status >= 400) {
      activeCapture.httpErrors.push({ url: message.params.response.url, status: message.params.response.status });
      activeCapture.lastNetworkEventAt = Date.now();
    }
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

  async function waitForNetworkIdle(capture, timeout = 5000, quietPeriod = 250) {
    if (!capture) return;
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (capture.pendingRequests.size === 0 && Date.now() - capture.lastNetworkEventAt >= quietPeriod) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (capture.pendingRequests.size > 0) throw new Error(`Network did not become idle for ${capture.profileName}:${capture.route}`);
  }

  async function keyPress(key, code, windowsVirtualKeyCode) {
    await call("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode, ...(key === "Enter" ? { text: "\r" } : {}) });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode });
  }

  async function selectorCenter(selector) {
    return evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      element.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
  }

  async function pointerActivate(selector, mode = "mouse") {
    const point = await selectorCenter(selector);
    if (!point) throw new Error(`Cannot activate hidden or missing control: ${selector}`);
    if (mode === "touch") {
      await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...point, id: 1 }] });
      await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await call("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
      await call("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
      await call("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
    }
  }

  async function activateControl(selector, mode = "mouse") {
    if (mode === "keyboard") {
      await evaluate("document.activeElement?.blur()");
      const focused = await focusWithTab(selector);
      if (!focused) return false;
      await keyPress("Enter", "Enter", 13);
      return true;
    }
    await pointerActivate(selector, mode);
    return true;
  }

  async function focusWithTab(selector) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await keyPress("Tab", "Tab", 9);
      if (await evaluate(`document.activeElement?.matches(${JSON.stringify(selector)})`)) return true;
    }
    return false;
  }

  async function focusEvidence(selector) {
    await evaluate("document.activeElement?.blur()");
    const focused = await focusWithTab(selector);
    const state = await evaluate(`(() => {
      const element = document.activeElement;
      if (!element || !element.matches(${JSON.stringify(selector)})) return { focused: false };
      const style = getComputedStyle(element);
      return {
        focused: true,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        focusVisible: element.matches(':focus-visible'),
      };
    })()`);
    check("accessibility", "*", `keyboard Tab focuses ${selector}`, focused && state.focused, state);
    check("accessibility", "*", `keyboard focus ring is visible for ${selector}`, focused && state.focusVisible && state.outlineStyle !== "none" && state.outlineWidth !== "0px", state);
    return state;
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
    await waitForNetworkIdle(activeCapture, 1500);
    const capture = createCapture(route, profileName);
    activeCapture = capture;
    const navigation = await call("Page.navigate", { url: pageUrl(route) });
    capture.loaderId = navigation.loaderId ?? null;
    const pathname = new URL(pageUrl(route)).pathname;
    const routeSelector = pathname === sitePrefix || pathname === `${sitePrefix}/`
      ? ".hero__copy h1"
      : pathname.endsWith("/papers/") ? ".research-console"
      : pathname.includes("/papers/") ? ".detail-shell"
      : pathname.endsWith("/models/") || pathname.endsWith("/datasets/") ? ".comparison-table"
      : pathname.endsWith("/graph/") ? ".relationship-list"
      : pathname.endsWith("/roadmap/") ? ".roadmap-full"
      : pathname.endsWith("/projects/") ? ".project-grid"
      : pathname.endsWith("/about/") ? ".about-grid"
      : "main h1";
    await waitFor(`location.pathname === ${JSON.stringify(pathname)} && document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(routeSelector)})) && (document.querySelector(${JSON.stringify(routeSelector)})?.getBoundingClientRect().height ?? 0) > 0`, options.timeout ?? 8000);
    await waitForNetworkIdle(capture);
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
    const routeResourceFailures = [...capture.resourceFailures];
    const routeHttpErrors = [...capture.httpErrors];
    const portableHttpErrors = routeHttpErrors.map((error) => ({ ...error, url: portableUrl(error.url) }));
    const requests = portableRequests(capture.requests);
    const record = { profile: profileName, route, viewport: { width: metrics.innerWidth, height: options.height ?? 0 }, assertions: metrics, consoleErrors: [...capture.pageErrors].map((error) => ({ ...error, url: error.url ? portableUrl(error.url) : undefined })), networkRequests: requests, resourceFailures: routeResourceFailures, httpErrors: portableHttpErrors };
    report.routeChecks.push(record);
    report.consoleErrors.push(...capture.pageErrors.map((error) => ({ profile: profileName, route, ...error, url: error.url ? portableUrl(error.url) : undefined })));
    report.resourceFailures.push(...routeResourceFailures.map((failure) => ({ profile: profileName, route, ...failure })));
    report.networkEvidence.push({ profile: profileName, route, requests, httpErrors: portableHttpErrors });
    check(profileName, route, "single main landmark", metrics.main && metrics.heading.length > 0, { main: metrics.main, heading: metrics.heading });
    check(profileName, route, "no horizontal overflow", !metrics.overflow, { scrollWidth: metrics.scrollWidth, innerWidth: metrics.innerWidth });
    check(profileName, route, "header links remain in viewport", metrics.clippedHeaderLinks.length === 0, { clipped: metrics.clippedHeaderLinks });
    check(profileName, route, "no console errors", capture.pageErrors.length === 0, { errors: capture.pageErrors });
    check(profileName, route, "all local resources load", routeResourceFailures.length === 0 && routeHttpErrors.length === 0, { resourceFailures: routeResourceFailures, httpErrors: portableHttpErrors });
    check(profileName, route, "configured base prefixes internal links", metrics.pathPrefixViolations.length === 0, { violations: metrics.pathPrefixViolations });
    return { metrics, requests: [...capture.requests], errors: [...capture.pageErrors] };
  }

  async function screenshot(name, profileName, route, viewport) {
    await evaluate("window.scrollTo(0, 0)");
    await evaluate("(() => { const copy = document.querySelector('.hero__copy'); if (copy) { copy.style.transform = 'translateZ(0)'; void copy.offsetHeight; } })()");
    await waitFor("document.fonts?.status === 'loaded'", 5000);
    await evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
    await call("Page.getLayoutMetrics");
    await evaluate("document.body.offsetHeight");
    let result;
    let previousData = null;
    let stable = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const current = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
      if (current.data === previousData) {
        result = current;
        stable = true;
        break;
      }
      previousData = current.data;
      result = current;
    }
    if (!stable || !result) throw new Error(`Screenshot did not reach a stable compositor frame: ${name}`);
    const file = path.join(artifactsDirectory, `${name}.png`);
    await writeFile(file, Buffer.from(result.data, "base64"));
    const record = { name, profile: profileName, route, viewport, file: portablePath(file) };
    report.screenshots.push(record);
    return record;
  }

  async function runSearch(profileName) {
    await waitFor("Boolean(document.querySelector('[data-search-controls-ready=\"true\"] input[type=\"search\"]'))", 5000);
    const input = await selectorCenter('[data-search-controls-ready="true"] input[type="search"]');
    if (!input) throw new Error('搜索控件缺失');
    await pointerActivate('[data-search-controls-ready="true"] input[type="search"]');
    await call("Input.insertText", { text: "视觉语言" });
    await waitFor("location.search.includes('q=') && document.querySelector('.research-console__count')?.textContent.includes('2 / 5')", 5000);
    const result = await evaluate(`(() => ({ ok: true, url: location.search, summary: document.querySelector('.research-console__count')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '' }))()`);
    check(profileName, "/papers", "search filters update URL and result count", result.ok && result.url.includes("q=") && result.summary.startsWith("2 / 5"), result);
    return result;
  }

  async function runGraph(profileName, route = "/graph", activation = "mouse") {
    const before = portableRequests(activeCapture?.requests ?? []);
    const button = await selectorCenter('.knowledge-graph__load');
    const clicked = Boolean(button);
    if (clicked) await activateControl('.knowledge-graph__load', activation);
    let ready = await waitFor("document.querySelector('[data-knowledge-map-ready=\"true\"]') && document.querySelectorAll('.knowledge-map__nodes button').length > 0", 6000);
    if (!ready && activation === "touch") {
      await activateControl('.knowledge-graph__load', activation);
      ready = await waitFor("document.querySelector('[data-knowledge-map-ready=\"true\"]') && document.querySelectorAll('.knowledge-map__nodes button').length > 0", 6000);
    }
    if (await selectorCenter('.knowledge-map__nodes button')) await activateControl('.knowledge-map__nodes button', activation === "touch" ? "keyboard" : activation);
    const pathReady = await waitFor("document.querySelectorAll('.knowledge-map__path a').length > 0", 3000);
    const after = portableRequests(activeCapture?.requests ?? []);
    const graph = await evaluate(`(() => ({
      loaded: Boolean(document.querySelector('[data-knowledge-map-ready="true"]')),
      nodeCount: document.querySelectorAll('.knowledge-map__nodes button').length,
      pathCount: document.querySelectorAll('.knowledge-map__path a').length,
      allTouchSized: [...document.querySelectorAll('.knowledge-map__controls input, .knowledge-map__controls select, .knowledge-map__nodes button')].every((element) => { const rect = element.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44; }),
    }))()`);
    check(profileName, route, "Cytoscape is absent before explicit activation", !before.some(isCytoscapeRequest), { before: before.filter(isCytoscapeRequest) });
    check(profileName, route, "graph loads after explicit activation", clicked && ready && pathReady && graph.loaded && graph.nodeCount > 0 && graph.pathCount > 0, { ...graph, activation, clicked, ready, pathReady });
    check(profileName, route, "Cytoscape request follows explicit activation", after.some(isCytoscapeRequest), { after: after.filter(isCytoscapeRequest) });
    return { before, after, graph };
  }

  await call("Page.enable");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: "Object.defineProperty(window, '__BROWSER_QA__', { value: true, configurable: false, enumerable: false, writable: false });" });
  await call("Runtime.enable");
  await call("Log.enable");
  await call("Network.enable");

  const desktop = { name: "desktop", viewport: { width: 1440, height: 900 }, reducedMotion: false, touch: false };
  report.profiles.push(desktop);
  await configureViewport({ ...desktop.viewport, mobile: false, reduced: false });
  for (const route of routes) await navigate(route, desktop.name, { height: desktop.viewport.height });
  await navigate("/", desktop.name, { height: desktop.viewport.height });
  const hero = await waitFor(`(() => {
    const dot = document.querySelector('[data-dot-grid-state]');
    const distortion = document.querySelector('[data-visual-state]');
    const embodiment = document.querySelector('[data-embodiment-unit]');
    const dotState = dot?.getAttribute('data-dot-grid-state');
    const distortionState = distortion?.getAttribute('data-visual-state');
    const embodimentState = embodiment?.getAttribute('data-embodiment-state');
    return dot && distortion && embodiment && ['ready', 'fallback'].includes(dotState) && ['ready', 'fallback'].includes(distortionState) && ['ready', 'fallback', 'fallback-error'].includes(embodimentState)
      ? { dotState, distortionState, embodimentState }
      : false;
  })()`, 6000);
  check(desktop.name, "/", "hero visual runtimes report ready or explicit fallback", Boolean(hero), hero || { missing: true });
  check(desktop.name, "/", "hero static fallback remains available", await evaluate("Boolean(document.querySelector('[data-embodiment-fallback=\"true\"]') && document.querySelector('.hero__static-art'))"), {});
  await screenshot("desktop-home", desktop.name, "/", desktop.viewport);
  await navigate("/papers", desktop.name, { height: desktop.viewport.height });
  await runSearch(desktop.name);
  await navigate("/graph", desktop.name, { height: desktop.viewport.height });
  await focusEvidence(".knowledge-graph__load");
  const spaceFocused = await focusWithTab(".knowledge-graph__load");
  if (spaceFocused) await keyPress(" ", "Space", 32);
  const spaceReady = await waitFor("Boolean(document.querySelector('[data-knowledge-map-ready=\"true\"]'))", 6000);
  check(desktop.name, "/graph", "Space activates the graph button", spaceFocused && spaceReady, { focused: spaceFocused, ready: spaceReady });
  await navigate("/graph", desktop.name, { height: desktop.viewport.height });
  const enterFocused = await focusWithTab(".knowledge-graph__load");
  if (enterFocused) await keyPress("Enter", "Enter", 13);
  const enterReady = await waitFor("Boolean(document.querySelector('[data-knowledge-map-ready=\"true\"]'))", 6000);
  check(desktop.name, "/graph", "Enter activates the graph button", enterFocused && enterReady, { focused: enterFocused, ready: enterReady });
  await navigate("/graph", desktop.name, { height: desktop.viewport.height });
  const desktopGraph = await runGraph(desktop.name);
  check(desktop.name, "/graph", "desktop graph has visible node/path controls", desktopGraph.graph.allTouchSized && desktopGraph.graph.nodeCount > 0, desktopGraph.graph);
  await screenshot("desktop-graph", desktop.name, "/graph", desktop.viewport);

  const mobile = { name: "mobile-touch", viewport: { width: 360, height: 800 }, reducedMotion: false, touch: true };
  report.profiles.push(mobile);
  await configureViewport({ ...mobile.viewport, mobile: true, reduced: false });
  for (const route of routes) {
    const result = await navigate(route, mobile.name, { height: mobile.viewport.height });
    check(mobile.name, route, "all visible controls meet 44px touch target", result.metrics.minControlWidth >= 44 && result.metrics.minControlHeight >= 44, { minWidth: result.metrics.minControlWidth, minHeight: result.metrics.minControlHeight });
    check(mobile.name, route, "Three.js does not download on touch/narrow viewport", !result.requests.some(isThreeRequest), { threeRequests: result.requests.filter(isThreeRequest) });
  }
  await navigate("/", mobile.name, { height: mobile.viewport.height });
  await screenshot("mobile-home", mobile.name, "/", mobile.viewport);
  await navigate("/graph", mobile.name, { height: mobile.viewport.height });
  const graphMobile = await runGraph(mobile.name, "/graph", "touch");
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
  await screenshot("reduced-motion-home", reduced.name, "/", reduced.viewport);
  await navigate("/papers", reduced.name, { height: reduced.viewport.height });
  await runSearch(reduced.name);
  await navigate("/papers/openvla", reduced.name, { height: reduced.viewport.height });
  await activateControl('.evidence-lens__button[data-lens="verified"]', "mouse");
  const reading = await evaluate(`(() => {
    const article = document.querySelector('.detail-shell article');
    const button = document.querySelector('.evidence-lens__button[data-lens="verified"]');
    if (!article || !button) return { ok: false };
    const prose = document.querySelector('.prose');
    return { ok: article.getAttribute('data-evidence-lens') === 'verified' && Boolean(prose && prose.textContent.trim().length > 80), proseVisible: Boolean(prose && getComputedStyle(prose).display !== 'none') };
  })()`);
  check(reduced.name, "/papers/openvla", "reduced-motion keeps reading tools usable", reading.ok && reading.proseVisible, reading);
  await navigate("/graph", reduced.name, { height: reduced.viewport.height });
  const reducedGraph = await runGraph(reduced.name, "/graph", "mouse");
  check(reduced.name, "/graph", "reduced-motion keeps graph usable", reducedGraph.graph.loaded && reducedGraph.graph.nodeCount > 0, reducedGraph.graph);
  await screenshot("reduced-motion-graph", reduced.name, "/graph", reduced.viewport);

  await call("Emulation.setScriptExecutionDisabled", { value: true });
  await navigate("/papers", "no-javascript", { height: 800 });
  const noJsPapers = await evaluate(`(() => {
    const fallback = document.querySelector('.paper-noscript-note');
    const rect = fallback?.getBoundingClientRect();
    return { cards: document.querySelectorAll('.paper-card').length, fallback: Boolean(fallback && rect?.width > 0 && rect?.height > 0 && /完整论文列表/.test(fallback.textContent)) };
  })()`);
  check("no-javascript", "/papers", "static paper list remains usable without JavaScript", noJsPapers.cards >= 5 && noJsPapers.fallback, noJsPapers);
  await navigate("/graph", "no-javascript", { height: 800 });
  const noJsGraph = await evaluate(`(() => {
    const list = document.querySelector('.relationship-list');
    const rect = list?.getBoundingClientRect();
    return { relationshipList: document.querySelectorAll('.relationship-list details').length, fallback: Boolean(list && rect?.width > 0 && rect?.height > 0 && /完整关系清单/.test(document.body.textContent)) };
  })()`);
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
  if (child.exitCode === null) child.kill("SIGTERM");
  await waitForExit(child);
  console.log(JSON.stringify(report, null, 2));
}
