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
const routes = ["/", "/papers", "/papers?q=视觉语言&status=verified", "/papers/openvla", "/models", "/datasets", "/graph", "/roadmap", "/projects", "/demos", "/about"];

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

function isExpectedMediaCancellation(url, params) {
  if (params.canceled !== true) return false;
  try {
    return /\.(?:mp4|webm)$/i.test(new URL(url).pathname) && new URL(url).origin === siteUrl.origin;
  } catch {
    return false;
  }
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
  return `artifacts/browser-qa/${path.basename(value)}`;
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
  if (!processHandle || processHandle.exitCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    let timer;
    const done = (exited) => {
      clearTimeout(timer);
      processHandle.removeListener("exit", done);
      resolve(exited);
    };
    processHandle.once("exit", () => done(true));
    timer = setTimeout(() => done(false), timeout);
    timer.unref();
  });
}

async function stopBrowserProcess(processHandle) {
  if (!processHandle || processHandle.exitCode !== null) return;
  processHandle.kill("SIGTERM");
  if (await waitForExit(processHandle)) return;
  processHandle.kill("SIGKILL");
  if (!(await waitForExit(processHandle))) throw new Error("Chrome did not exit after SIGKILL");
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
      bufferedNetworkEvents: [],
    };
  }
  function currentCaptureAccepts(params, capture = activeCapture) {
    return Boolean(capture?.loaderId && params.loaderId && params.loaderId === capture.loaderId);
  }
  function recordNetworkEvent(message, capture) {
    const { method, params } = message;
    if (!capture) return;
    if (method === "Network.requestWillBeSent" && currentCaptureAccepts(params, capture)) {
      capture.requests.push(params.request.url);
      capture.requestUrls.set(params.requestId, params.request.url);
      capture.pendingRequests.add(params.requestId);
      capture.lastNetworkEventAt = Date.now();
    }
    if (method === "Network.loadingFinished" && capture.requestUrls.has(params.requestId)) {
      capture.pendingRequests.delete(params.requestId);
      capture.lastNetworkEventAt = Date.now();
    }
    if (method === "Network.loadingFailed" && capture.requestUrls.has(params.requestId)) {
      capture.pendingRequests.delete(params.requestId);
      const requestUrl = capture.requestUrls.get(params.requestId) ?? "<unknown>";
      if (!isExpectedMediaCancellation(requestUrl, params)) {
        capture.resourceFailures.push({ url: requestUrl, error: params.errorText, canceled: params.canceled === true });
      }
      capture.lastNetworkEventAt = Date.now();
    }
    if (method === "Network.responseReceived" && currentCaptureAccepts(params, capture) && params.response.status >= 400) {
      capture.httpErrors.push({ url: params.response.url, status: params.response.status });
      capture.lastNetworkEventAt = Date.now();
    }
  }
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown" && activeCapture) activeCapture.pageErrors.push({ type: "exception", text: message.params.exceptionDetails.text, description: message.params.exceptionDetails.exception?.description ?? "" });
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      const { text, url } = message.params.entry;
      if (activeCapture && !url?.includes("/.well-known/appspecific/com.chrome.devtools.json")) activeCapture.pageErrors.push({ type: "console", text, url: url ?? "" });
    }
    if (message.method?.startsWith("Network.") && activeCapture) {
      if (!activeCapture.loaderId) activeCapture.bufferedNetworkEvents.push(message);
      else recordNetworkEvent(message, activeCapture);
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
      element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
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
    if (!navigation.loaderId) throw new Error(`Navigation did not provide a loaderId for ${profileName}:${route}`);
    capture.loaderId = navigation.loaderId;
    for (const message of capture.bufferedNetworkEvents) recordNetworkEvent(message, capture);
    capture.bufferedNetworkEvents = [];
    const pathname = new URL(pageUrl(route)).pathname;
    const routeSelector = pathname === sitePrefix || pathname === `${sitePrefix}/`
      ? ".atlas-hero__copy h1"
      : pathname.endsWith("/papers/") ? ".research-console"
      : pathname.includes("/papers/") ? ".detail-shell"
      : pathname.endsWith("/models/") || pathname.endsWith("/datasets/") ? ".comparison-table"
      : pathname.endsWith("/graph/") ? ".relationship-list"
      : pathname.endsWith("/roadmap/") ? ".roadmap-full"
      : pathname.endsWith("/projects/") ? ".project-grid"
      : pathname.endsWith("/demos/") ? "[data-demo-gallery], .demo-gallery, main h1"
      : pathname.includes("/demos/") ? "[data-demo-detail], .demo-detail, main h1"
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
      const rawScrollWidth = document.documentElement.scrollWidth;
      return {
        title: document.title,
        main: Boolean(document.querySelector('main')),
        heading: document.querySelector('h1')?.textContent?.trim() ?? '',
        innerWidth: window.innerWidth,
        // A non-overlay vertical scrollbar can reduce scrollWidth by its
        // platform width without representing horizontal overflow. Normalize
        // that benign difference while retaining the real overflow boolean.
        scrollWidth: rawScrollWidth > window.innerWidth ? rawScrollWidth : window.innerWidth,
        overflow: rawScrollWidth > window.innerWidth,
        clippedHeaderLinks: [...document.querySelectorAll('.site-header a')].filter((link) => { const rect = link.getBoundingClientRect(); return rect.left < 0 || rect.right > window.innerWidth; }).map((link) => link.textContent.trim()),
        clippedHeadings: [...document.querySelectorAll('main h1, main h2')].filter(visible).filter((heading) => { const rect = heading.getBoundingClientRect(); return rect.left < -0.5 || rect.right > window.innerWidth + 0.5 || heading.scrollWidth > heading.clientWidth + 1; }).map((heading) => ({ text: heading.textContent?.trim().slice(0, 80) ?? '', clientWidth: heading.clientWidth, scrollWidth: heading.scrollWidth })),
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
    check(profileName, route, "headings fit within their content boxes", metrics.clippedHeadings.length === 0, { clipped: metrics.clippedHeadings });
    check(profileName, route, "no console errors", capture.pageErrors.length === 0, { errors: capture.pageErrors });
    check(profileName, route, "all local resources load", routeResourceFailures.length === 0 && routeHttpErrors.length === 0, { resourceFailures: routeResourceFailures, httpErrors: portableHttpErrors });
    check(profileName, route, "configured base prefixes internal links", metrics.pathPrefixViolations.length === 0, { violations: metrics.pathPrefixViolations });
    return { metrics, requests: [...capture.requests], errors: [...capture.pageErrors] };
  }

  async function screenshot(name, profileName, route, viewport) {
    await evaluate("window.scrollTo(0, 0)");
    await evaluate("(() => { if (document.querySelector('[data-browser-qa-freeze]')) return; const style = document.createElement('style'); style.dataset.browserQaFreeze = 'true'; style.textContent = '*,:before,:after { animation: none !important; transition: none !important; caret-color: transparent !important; }'; document.head.append(style); })()");
    await evaluate("(() => { const copy = document.querySelector('.atlas-hero__copy'); if (copy) { copy.style.transform = 'translateZ(0)'; void copy.offsetHeight; } })()");
    await waitFor("document.fonts?.status === 'loaded'", 5000);
    await evaluate("new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
    await call("Page.getLayoutMetrics");
    await evaluate("document.body.offsetHeight");
    let result;
    let previousData = null;
    let stable = false;
    for (let attempt = 0; attempt < 16; attempt += 1) {
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
    await waitFor("Boolean(document.querySelector('[data-search-controls-ready=\"true\"]:not([hidden]) input[type=\"search\"]'))", 5000);
    const input = await selectorCenter('[data-search-controls-ready="true"] input[type="search"]');
    if (!input) throw new Error('搜索控件缺失');
    await pointerActivate('[data-search-controls-ready="true"] input[type="search"]');
    await waitFor("document.activeElement === document.querySelector('[data-search-controls-ready=\"true\"] input[type=\"search\"]')", 2000);
    await call("Input.insertText", { text: "视觉语言" });
    const updated = await waitFor("location.search.includes('q=') && document.querySelector('.research-console__count')?.textContent.includes('2 / 5')", 5000);
    const result = await evaluate(`(() => { const url = location.search; const summary = document.querySelector('.research-console__count')?.textContent?.replace(/\\s+/g, ' ').trim() ?? ''; return { ok: Boolean(${Boolean(updated)} && url.includes('q=') && summary.startsWith('2 / 5')), url, summary }; })()`);
    check(profileName, "/papers", "search filters update URL and result count", result.ok && result.url.includes("q=") && result.summary.startsWith("2 / 5"), result);
    return result;
  }

  async function runNavigator(profileName, route = "/", options = {}) {
    await selectorCenter("#navigator");
    await waitFor("Boolean(document.querySelector('[data-atlas-navigator-ready=\"true\"]'))", 3000);
    const navigator = await evaluate(`(() => {
      const root = document.querySelector("#navigator");
      const links = [...(root?.querySelectorAll("a[href]") ?? [])];
      const hrefs = links.map((link) => new URL(link.href, location.href).pathname);
      const nodes = [...(root?.querySelectorAll("[data-atlas-node], .atlas-destination") ?? [])];
      const preview = document.querySelector("#atlas-active-preview");
      const activeLinks = [...(root?.querySelectorAll('[data-atlas-active="true"]') ?? [])];
      return {
        exists: Boolean(root),
        linkCount: links.length,
        uniqueLinks: new Set(hrefs).size,
        hrefs,
        hasDemo: hrefs.some((href) => href.endsWith("/demos/")),
        nodeCount: nodes.length,
        ready: document.querySelector('[data-atlas-navigator-ready="true"]')?.getAttribute("data-atlas-navigator-ready") === "true",
        mode: document.querySelector("[data-atlas-navigator-mode]")?.getAttribute("data-atlas-navigator-mode") ?? "missing",
        ariaCurrentCount: root?.querySelectorAll("[aria-current]").length ?? 0,
        activeLinkCount: activeLinks.length,
        preview: Boolean(preview && preview.getAttribute("aria-live") === "polite"),
        activeDescribedBy: activeLinks.map((link) => link.getAttribute("aria-describedby")),
      };
    })()`);
    const expectedCount = options.expectedCount ?? 7;
    check(profileName, route, "atlas navigator exposes one complete destination set", navigator.exists && navigator.linkCount === expectedCount && navigator.uniqueLinks === expectedCount && navigator.nodeCount === expectedCount && navigator.hasDemo, navigator);
    check(profileName, route, "atlas navigator has a truthful hydration marker", navigator.ready, navigator);
    check(profileName, route, "atlas navigator does not publish false aria-current state", navigator.ariaCurrentCount === 0, navigator);
    check(profileName, route, "atlas active preview remains linked and live", navigator.preview && navigator.activeLinkCount === 1 && navigator.activeDescribedBy[0] === "atlas-active-preview", navigator);
    if (options.staticMode) {
      const staticStyles = await evaluate(`(() => [...document.querySelectorAll("#navigator [data-atlas-node], #navigator .atlas-destination")].map((element) => getComputedStyle(element).transition).every((transition) => transition === "none" || transition.startsWith("none ")))()`);
      const phaseBefore = await evaluate("getComputedStyle(document.querySelector('[data-atlas-navigator-mode]')).getPropertyValue('--atlas-phase')");
      await new Promise((resolve) => setTimeout(resolve, 350));
      const phaseAfter = await evaluate("getComputedStyle(document.querySelector('[data-atlas-navigator-mode]')).getPropertyValue('--atlas-phase')");
      check(profileName, route, "atlas navigator reports static mode on this profile", navigator.mode === "static", navigator);
      check(profileName, route, "static atlas navigator nodes have no transition", staticStyles, { staticStyles, mode: navigator.mode });
      if (profileName === "mobile-touch") check(profileName, route, "static atlas navigator phase remains frozen", phaseBefore === phaseAfter, { phaseBefore, phaseAfter, mode: navigator.mode });
    }
    return navigator;
  }

  async function runNavigatorInteractions(profileName, route = "/") {
    const stage = await selectorCenter(".atlas-navigator__stage");
    const before = await evaluate("document.querySelector('[data-atlas-active=\"true\"]')?.getAttribute('data-atlas-index') ?? null");
    await evaluate("document.activeElement?.blur()");
    const tabFocused = await focusWithTab(".atlas-navigator__stage");
    const focused = tabFocused || await evaluate("(() => { const stage = document.querySelector('.atlas-navigator__stage'); stage?.focus(); return document.activeElement === stage; })()");
    if (focused) {
      await keyPress("ArrowRight", "ArrowRight", 39);
      await evaluate("document.querySelector('.atlas-navigator__stage')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))");
    }
    const after = await waitFor("document.querySelector('[data-atlas-active=\"true\"]')?.getAttribute('data-atlas-index') ?? null", 1500);
    const moved = before !== null && after !== null && before !== after;
    check(profileName, route, "atlas navigator stage accepts ArrowRight selection", Boolean(stage) && focused && moved, { stage: Boolean(stage), focused, tabFocused, before, after });
    const pause = await evaluate("Boolean(document.querySelector('[data-atlas-navigator-control=\"pause\"]:not([hidden])'))");
    if (!pause) {
      check(profileName, route, "atlas orbit exposes pause and resume controls", false, { pause });
      return;
    }
    await activateControl('[data-atlas-navigator-control="pause"]');
    const paused = await waitFor("document.querySelector('[data-atlas-navigator-mode]')?.getAttribute('data-atlas-navigator-mode') === 'paused'", 1500);
    await activateControl('[data-atlas-navigator-control="pause"]');
    const resumed = await waitFor("document.querySelector('[data-atlas-navigator-mode]')?.getAttribute('data-atlas-navigator-mode') === 'orbit'", 1500);
    check(profileName, route, "atlas orbit pause and resume controls work", paused && resumed, { paused, resumed });
  }

  async function runDemoLab(profileName, route = "/demos", options = {}) {
    const gallery = await evaluate(`(() => {
      const visible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const galleryRoot = document.querySelector("[data-demo-gallery], .demo-gallery, .demos-grid, .demo-empty");
      const emptyState = document.querySelector('[data-demo-empty-state], .demo-empty-state, .demo-empty');
      const detailLinks = [...document.querySelectorAll("main a[href]")]
        .map((link) => new URL(link.href, location.href).pathname)
        .filter((href) => /\\/demos\\/[^/]+\\/$/.test(href));
      const cards = document.querySelectorAll('[data-demo-card], .demo-card').length;
      const videos = document.querySelectorAll("video").length;
      const bodyText = document.body.textContent?.replace(/\\s+/g, " ").trim() ?? "";
      return {
        heading: document.querySelector("main h1")?.textContent?.trim() ?? "",
        gallery: Boolean(galleryRoot),
        emptyState: visible(emptyState) || bodyText.includes("尚无已审核并公开的 Demo"),
        cards,
        detailLinks: [...new Set(detailLinks)],
        videos,
        forbiddenFields: document.querySelectorAll('[data-demo-company], [data-demo-employer], [data-demo-client]').length,
        bodyText,
      };
    })()`);
    const hasRecords = gallery.cards > 0 || gallery.detailLinks.length > 0;
    const galleryHasEmptyState = !hasRecords && gallery.emptyState;
    const externalRequests = (activeCapture?.requests ?? []).filter((requestUrl) => {
      if (requestUrl.startsWith("data:") || requestUrl.startsWith("blob:")) return false;
      try { return new URL(requestUrl).origin !== siteUrl.origin; } catch { return false; }
    });
    check(profileName, route, "Demo Lab gallery exposes an honest empty state or approved records", gallery.gallery && (galleryHasEmptyState || hasRecords), { ...gallery, hasRecords, galleryHasEmptyState });
    check(profileName, route, "Demo Lab does not expose organization identity fields", gallery.forbiddenFields === 0, { forbiddenFields: gallery.forbiddenFields });
    check(profileName, route, "Demo Lab listing does not preload playable videos", gallery.videos === 0, { videos: gallery.videos, hasRecords });
    check(profileName, route, "Demo Lab uses same-origin static assets without content-fetch dependencies", externalRequests.length === 0, { externalRequests: externalRequests.map(portableUrl) });
    check(profileName, route, "Demo Lab empty state remains truthful without JavaScript", !hasRecords || gallery.cards > 0, { ...gallery, hasRecords });
    if (!hasRecords) {
      check(profileName, route, "Demo Lab detail video check is correctly gated until records exist", true, { gated: true });
      return { gallery, hasRecords, detail: null };
    }

    const detailRoute = gallery.detailLinks[0].slice(sitePrefix.length).replace(/^\/+/, "/").replace(/\/$/, "") || "/";
    await navigate(detailRoute, profileName, { height: options.height });
    const detail = await evaluate(`(() => {
      const videos = [...document.querySelectorAll("video")];
      const sources = videos.flatMap((video) => [...video.querySelectorAll("source")].map((source) => source.getAttribute("src") ?? ""));
      const tracks = videos.flatMap((video) => [...video.querySelectorAll('track[kind="captions"]')]);
      const visible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const unsafe = [...document.querySelectorAll("iframe, video[autoplay], video[loop]")];
      return {
        heading: document.querySelector("main h1")?.textContent?.trim() ?? "",
        videoCount: videos.length,
        allVisible: videos.every(visible),
        allControlled: videos.every((video) => video.hasAttribute("controls") && video.hasAttribute("playsinline") && video.getAttribute("preload") === "metadata"),
        allPostered: videos.every((video) => Boolean(video.getAttribute("poster"))),
        allLabeled: videos.every((video) => Boolean(video.getAttribute("aria-label")?.trim())),
        sources,
        sourcesBaseSafe: sources.length > 0 && sources.every((source) => !source.startsWith("/") || source.startsWith(${JSON.stringify(sitePrefix || "")})),
        captions: tracks.length,
        unsafeCount: unsafe.length,
        fallbackText: videos.every((video) => (video.parentElement?.textContent?.trim().length ?? 0) > 0),
      };
    })()`);
    check(profileName, detailRoute, "Demo detail has a visible native video when a record exists", detail.videoCount > 0 && detail.allVisible, detail);
    check(profileName, detailRoute, "Demo detail video exposes accessible native controls", detail.videoCount > 0 && detail.allControlled && detail.allPostered && detail.allLabeled && detail.fallbackText, detail);
    check(profileName, detailRoute, "Demo detail video sources are base-safe", detail.sourcesBaseSafe && detail.unsafeCount === 0, detail);
    return { gallery, hasRecords, detail, detailRoute };
  }

  async function runGraph(profileName, route = "/graph", activation = "mouse") {
    const before = portableRequests(activeCapture?.requests ?? []);
    const controlsReady = await waitFor("Boolean(document.querySelector('[data-knowledge-graph-controls-ready=\"true\"] .knowledge-graph__load, [data-knowledge-graph-controls-ready=\"true\"]'))", 6000);
    const buttonReady = await waitFor("Boolean(document.querySelector('[data-knowledge-graph-controls-ready=\"true\"] .knowledge-graph__load:not([disabled])'))", 3000);
    const button = await selectorCenter('.knowledge-graph__load');
    const clicked = Boolean(button && buttonReady);
    let activationObserved = false;
    if (clicked) {
      await activateControl('.knowledge-graph__load', activation);
      activationObserved = await waitFor("Boolean(document.querySelector('[data-knowledge-graph-state=\"loading\"], [data-knowledge-map-ready=\"true\"]'))", 2500);
    }
    let ready = await waitFor("document.querySelector('[data-knowledge-graph-controls-ready=\"true\"][data-knowledge-map-ready=\"true\"]') && document.querySelectorAll('.knowledge-map__nodes button').length > 0", 6000);
    if (!ready && activation === "touch") {
      await activateControl('.knowledge-graph__load', activation);
      activationObserved = await waitFor("Boolean(document.querySelector('[data-knowledge-graph-state=\"loading\"], [data-knowledge-map-ready=\"true\"]'))", 2500);
      ready = await waitFor("document.querySelector('[data-knowledge-graph-controls-ready=\"true\"][data-knowledge-map-ready=\"true\"]') && document.querySelectorAll('.knowledge-map__nodes button').length > 0", 6000);
    }
    const nodeReady = await waitFor("Boolean(document.querySelector('.knowledge-map__nodes button') && (() => { const rect = document.querySelector('.knowledge-map__nodes button').getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44; })())", 3000);
    let nodeActivated = false;
    if (nodeReady && await selectorCenter('.knowledge-map__nodes button')) {
      nodeActivated = await activateControl('.knowledge-map__nodes button', activation === "touch" ? "keyboard" : activation);
    }
    let pathReady = await waitFor("document.querySelectorAll('.knowledge-map__path a').length > 0", 3000);
    let keyboardFallback = false;
    if (!pathReady && nodeReady && activation === "mouse") {
      keyboardFallback = await activateControl('.knowledge-map__nodes button', "keyboard");
      pathReady = await waitFor("document.querySelectorAll('.knowledge-map__path a').length > 0", 3000);
    }
    const after = portableRequests(activeCapture?.requests ?? []);
    const graph = await evaluate(`(() => ({
      loaded: Boolean(document.querySelector('[data-knowledge-graph-controls-ready="true"][data-knowledge-map-ready="true"]')),
      nodeCount: document.querySelectorAll('.knowledge-map__nodes button').length,
      pathCount: document.querySelectorAll('.knowledge-map__path a').length,
      allTouchSized: [...document.querySelectorAll('.knowledge-map__controls input, .knowledge-map__controls select, .knowledge-map__nodes button')].every((element) => { const rect = element.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44; }),
    }))()`);
    check(profileName, route, "graph controls are hydrated before activation", controlsReady && buttonReady && Boolean(button), { controlsReady, buttonReady, button: Boolean(button) });
    check(profileName, route, "Cytoscape is absent before explicit activation", !before.some(isCytoscapeRequest), { before: before.filter(isCytoscapeRequest) });
    check(profileName, route, "graph activation reports a loading or ready state", !clicked || activationObserved, { activation, clicked, activationObserved });
    check(profileName, route, "graph node navigation is ready before activation", !ready || nodeReady, { activation, ready, nodeReady });
    check(profileName, route, "graph loads after explicit activation", controlsReady && buttonReady && clicked && activationObserved && ready && nodeReady && nodeActivated && pathReady && graph.loaded && graph.nodeCount > 0 && graph.pathCount > 0, { ...graph, activation, controlsReady, buttonReady, clicked, activationObserved, ready, nodeReady, nodeActivated, pathReady, keyboardFallback });
    check(profileName, route, "Cytoscape request follows explicit activation", after.some(isCytoscapeRequest), { after: after.filter(isCytoscapeRequest) });
    return { before, after, graph };
  }

  await call("Page.enable");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: "Object.defineProperty(window, '__BROWSER_QA__', { value: true, configurable: false, enumerable: false, writable: false }); const browserQaOriginalRaf = window.requestAnimationFrame?.bind(window); window.__BROWSER_QA_RAF_COUNT__ = 0; if (browserQaOriginalRaf) window.requestAnimationFrame = (callback) => { window.__BROWSER_QA_RAF_COUNT__ += 1; return browserQaOriginalRaf(callback); };" });
  await call("Runtime.enable");
  await call("Log.enable");
  await call("Network.enable");

  const desktop = { name: "desktop", viewport: { width: 1440, height: 900 }, reducedMotion: false, touch: false };
  report.profiles.push(desktop);
  await configureViewport({ ...desktop.viewport, mobile: false, reduced: false });
  for (const route of routes) {
    const result = await navigate(route, desktop.name, { height: desktop.viewport.height });
    check(desktop.name, route, "all visible controls meet 44px target", result.metrics.minControlWidth >= 44 && result.metrics.minControlHeight >= 44, { minWidth: result.metrics.minControlWidth, minHeight: result.metrics.minControlHeight });
  }
  await navigate("/", desktop.name, { height: desktop.viewport.height });
  const hero = await waitFor(`(() => {
    const root = document.querySelector('[data-hero-capability-state]');
    const capabilityState = root?.getAttribute('data-hero-capability-state');
    const dot = document.querySelector('[data-dot-grid-state]');
    const distortion = document.querySelector('[data-visual-state]');
    const embodiment = document.querySelector('[data-embodiment-unit]');
    const staticArt = document.querySelector('.atlas-hero__static-art');
    const staticStyle = staticArt ? getComputedStyle(staticArt) : null;
    const dotState = dot?.getAttribute('data-dot-grid-state');
    const distortionState = distortion?.getAttribute('data-visual-state');
    const embodimentState = embodiment?.getAttribute('data-embodiment-state');
    const embodimentTerminal = ['ready', 'fallback', 'fallback-error'].includes(embodimentState);
    if (!root || !['enhanced', 'capability-fallback'].includes(capabilityState) || !embodiment || !embodimentTerminal) return false;
    if (capabilityState === 'capability-fallback') {
      return staticArt && staticStyle && staticStyle.display !== 'none' && staticStyle.visibility !== 'hidden'
        ? { capabilityState, dotState: null, distortionState: null, embodimentState, staticFallback: true }
        : false;
    }
    return dot && distortion && ['ready', 'fallback'].includes(dotState) && ['ready', 'fallback'].includes(distortionState)
      ? { capabilityState, dotState, distortionState, embodimentState, staticFallback: Boolean(staticArt) }
      : false;
  })()`, 6000);
  check(desktop.name, "/", "hero visual runtimes report ready or explicit fallback", Boolean(hero), hero || { missing: true });
  check(desktop.name, "/", "hero static fallback remains available", await evaluate("Boolean(document.querySelector('[data-embodiment-fallback=\"true\"]') && document.querySelector('.atlas-hero__static-art'))"), {});
  const desktopAtlas = await evaluate(`(() => {
    const strip = document.querySelector('.atlas-chapter-strip');
    const status = document.querySelector('.atlas-status')?.textContent ?? '';
    const rect = strip?.getBoundingClientRect();
    return { chapterStripHeight: rect?.height ?? 0, gitTracked: /GIT-TRACKED/.test(status) };
  })()`);
  check(desktop.name, "/", "atlas chapter strip meets 44px minimum", desktopAtlas.chapterStripHeight >= 44, desktopAtlas);
  check(desktop.name, "/", "atlas status exposes Git-tracked repository state", desktopAtlas.gitTracked, desktopAtlas);
  await runNavigator(desktop.name);
  await runNavigatorInteractions(desktop.name);
  await screenshot("desktop-home", desktop.name, "/", desktop.viewport);
  await navigate("/demos", desktop.name, { height: desktop.viewport.height });
  await screenshot("desktop-demos", desktop.name, "/demos", desktop.viewport);
  const desktopDemo = await runDemoLab(desktop.name, "/demos", { height: desktop.viewport.height });
  if (desktopDemo.detailRoute) await screenshot("desktop-wam-showcase", desktop.name, desktopDemo.detailRoute, desktop.viewport);
  await navigate("/papers", desktop.name, { height: desktop.viewport.height });
  await runSearch(desktop.name);
  await navigate("/graph", desktop.name, { height: desktop.viewport.height });
  const spaceControlsReady = await waitFor("Boolean(document.querySelector('[data-knowledge-graph-controls-ready=\"true\"] .knowledge-graph__load'))", 6000);
  await focusEvidence(".knowledge-graph__load");
  const spaceFocused = await focusWithTab(".knowledge-graph__load");
  if (spaceFocused) await keyPress(" ", "Space", 32);
  const spaceReady = await waitFor("Boolean(document.querySelector('[data-knowledge-map-ready=\"true\"]'))", 6000);
  check(desktop.name, "/graph", "Space activates the graph button", spaceControlsReady && spaceFocused && spaceReady, { controlsReady: spaceControlsReady, focused: spaceFocused, ready: spaceReady });
  await navigate("/graph", desktop.name, { height: desktop.viewport.height });
  const enterControlsReady = await waitFor("Boolean(document.querySelector('[data-knowledge-graph-controls-ready=\"true\"] .knowledge-graph__load'))", 6000);
  const enterFocused = await focusWithTab(".knowledge-graph__load");
  if (enterFocused) await keyPress("Enter", "Enter", 13);
  const enterReady = await waitFor("Boolean(document.querySelector('[data-knowledge-map-ready=\"true\"]'))", 6000);
  check(desktop.name, "/graph", "Enter activates the graph button", enterControlsReady && enterFocused && enterReady, { controlsReady: enterControlsReady, focused: enterFocused, ready: enterReady });
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
  const mobileAtlas = await evaluate(`(() => {
    const strip = document.querySelector('.atlas-chapter-strip');
    const rect = strip?.getBoundingClientRect();
    return { chapterStripHeight: rect?.height ?? 0 };
  })()`);
  check(mobile.name, "/", "atlas chapter strip meets 44px minimum", mobileAtlas.chapterStripHeight >= 44, mobileAtlas);
  await runNavigator(mobile.name, "/", { staticMode: true });
  await screenshot("mobile-home", mobile.name, "/", mobile.viewport);
  await navigate("/demos", mobile.name, { height: mobile.viewport.height });
  await screenshot("mobile-demos", mobile.name, "/demos", mobile.viewport);
  const mobileDemo = await runDemoLab(mobile.name, "/demos", { height: mobile.viewport.height });
  if (mobileDemo.detailRoute) await screenshot("mobile-wam-showcase", mobile.name, mobileDemo.detailRoute, mobile.viewport);
  await navigate("/graph", mobile.name, { height: mobile.viewport.height });
  const graphMobile = await runGraph(mobile.name, "/graph", "touch");
  check(mobile.name, "/graph", "activated graph controls meet 44px touch target", graphMobile.graph.allTouchSized, graphMobile.graph);

  const reduced = { name: "desktop-reduced-motion", viewport: { width: 1440, height: 900 }, reducedMotion: true, touch: false };
  report.profiles.push(reduced);
  await configureViewport({ ...reduced.viewport, mobile: false, reduced: true });
  await navigate("/", reduced.name, { height: reduced.viewport.height });
  const reducedState = await evaluate(`(() => {
    const staticArt = document.querySelector('.atlas-hero__static-art');
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
  const reducedAtlas = await evaluate(`(() => {
    const strip = document.querySelector('.atlas-chapter-strip');
    const rect = strip?.getBoundingClientRect();
    return { chapterStripHeight: rect?.height ?? 0 };
  })()`);
  check(reduced.name, "/", "atlas chapter strip meets 44px minimum", reducedAtlas.chapterStripHeight >= 44, reducedAtlas);
  await runNavigator(reduced.name, "/", { staticMode: true });
  await screenshot("reduced-motion-home", reduced.name, "/", reduced.viewport);
  await navigate("/demos", reduced.name, { height: reduced.viewport.height });
  await runDemoLab(reduced.name, "/demos", { height: reduced.viewport.height });
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
  await navigate("/", "no-javascript", { height: 800 });
  const noJsHome = await evaluate(`(() => {
    const root = document.querySelector("#navigator");
    const links = [...(root?.querySelectorAll("a[href]") ?? [])];
    const hrefs = links.map((link) => new URL(link.href, location.href).pathname);
    return {
      linkCount: links.length,
      uniqueLinks: new Set(hrefs).size,
      hasDemo: hrefs.some((href) => href.endsWith("/demos/")),
      ariaCurrentCount: root?.querySelectorAll("[aria-current]").length ?? 0,
    };
  })()`);
  check("no-javascript", "/", "static atlas navigator retains the Demo Lab destination without JavaScript", noJsHome.linkCount === 7 && noJsHome.uniqueLinks === 7 && noJsHome.hasDemo && noJsHome.ariaCurrentCount === 0, noJsHome);
  await navigate("/demos", "no-javascript", { height: 800 });
  const noJsDemos = await evaluate(`(() => {
    const emptyState = document.querySelector('[data-demo-empty-state], .demo-empty-state, .demo-empty');
    const bodyText = document.body.textContent?.replace(/\\s+/g, " ").trim() ?? "";
    const rect = emptyState?.getBoundingClientRect();
      return {
        heading: document.querySelector("main h1")?.textContent?.trim() ?? "",
        bodyText,
        emptyState: Boolean(emptyState && rect?.width > 0 && rect?.height > 0) || bodyText.includes("尚无已审核并公开的 Demo"),
        cards: document.querySelectorAll('[data-demo-card], .demo-card').length,
      scripts: document.querySelectorAll("script").length,
    };
  })()`);
  check("no-javascript", "/demos", "Demo Lab remains readable without JavaScript", /Demo Lab|作品实验室/.test(`${noJsDemos.heading} ${noJsDemos.bodyText}`) && (noJsDemos.emptyState || noJsDemos.cards > 0), noJsDemos);
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
  await stopBrowserProcess(child);
  console.log(JSON.stringify(report, null, 2));
}
