import { execFile } from "node:child_process";
import { promisify } from "node:util";
import net from "node:net";
import { spawn } from "node:child_process";

const execFileAsync = promisify(execFile);

export const BROWSER_ADAPTERS = Object.freeze({
  CHROME: "chrome",
  SAFARI: "safari"
});

export function isBrowserFallbackError(errorOrMessage = "") {
  const message = errorOrMessage instanceof Error ? errorOrMessage.message : String(errorOrMessage);
  return /230404|operation not permitted|browser.?act.{0,80}permission|permission.{0,80}(?:chrome|browser)|no running chrome|chrome-direct.{0,80}(?:not available|unavailable)|chrome.{0,80}(?:unavailable|not running|timeout)|(?:timeout|timed out).{0,80}(?:chrome|browser|cdp)|(?:chrome|browser|cdp).{0,80}(?:timeout|timed out)|connection.{0,80}(?:chrome|browser).{0,80}(?:timeout|failed)/i.test(message);
}

export function createChromeAdapter({ browserId, browserCommand, closeSession }) {
  if (!browserId || typeof browserCommand !== "function" || typeof closeSession !== "function") {
    throw new Error("Chrome adapter requires a browser id and command functions.");
  }
  return {
    kind: BROWSER_ADAPTERS.CHROME,
    browserId,
    async open(session, url) { return browserCommand(session, ["browser", "open", browserId, url]); },
    async navigate(session, url) { return browserCommand(session, ["navigate", url]); },
    async waitStable(session) { return browserCommand(session, ["wait", "stable"]); },
    async state(session) { return browserCommand(session, ["state"]); },
    async click(session, index) { return browserCommand(session, ["click", String(index)]); },
    async scroll(session, direction, amount) { return browserCommand(session, ["scroll", direction, "--amount", String(amount)]); },
    async close(session) { return closeSession(session); }
  };
}

export function createSafariAdapter(options = {}) {
  return new SafariWebDriverAdapter(options);
}

class SafariWebDriverAdapter {
  constructor({
    executable = "safaridriver",
    spawnImpl = spawn,
    fetchImpl = globalThis.fetch,
    execFileImpl = execFileAsync,
    portFactory = findFreePort,
    now = () => Date.now()
  } = {}) {
    this.kind = BROWSER_ADAPTERS.SAFARI;
    this.executable = executable;
    this.spawnImpl = spawnImpl;
    this.fetchImpl = fetchImpl;
    this.execFileImpl = execFileImpl;
    this.portFactory = portFactory;
    this.now = now;
    this.process = null;
    this.port = null;
    this.sessionId = null;
    this.serverUrl = null;
  }

  async open(_session, url) {
    await this.ensureSession();
    return this.navigate(_session, url);
  }

  async navigate(_session, url) {
    this.requireSession();
    await this.request("POST", `/session/${this.sessionId}/url`, { url });
    return this.state(_session);
  }

  async waitStable(_session, timeoutMs = 10_000) {
    this.requireSession();
    const deadline = this.now() + timeoutMs;
    while (this.now() < deadline) {
      const ready = await this.execute("return document.readyState;");
      if (ready === "complete" || ready === "interactive") return { ok: true };
      await delay(250);
    }
    throw new Error("Safari page did not become ready before timeout.");
  }

  async state(_session) {
    this.requireSession();
    const [url, text] = await Promise.all([
      this.request("GET", `/session/${this.sessionId}/url`),
      this.execute("return document.body ? document.body.innerText : '';" )
    ]);
    return { ok: true, url, text: String(text || "") };
  }

  async click(_session, index) {
    this.requireSession();
    const result = await this.execute(`
      const nodes = Array.from(document.querySelectorAll('a,button,[role="link"],[role="button"],input,select,textarea'));
      const node = nodes[${Number(index)}];
      if (!node) return false;
      node.click();
      return true;
    `);
    if (!result) throw new Error(`Safari interactive element ${index} was not found.`);
    return { ok: true };
  }

  async scroll(_session, direction = "down", amount = 600) {
    this.requireSession();
    const delta = direction === "up" ? -Math.abs(Number(amount) || 600) : Math.abs(Number(amount) || 600);
    await this.execute(`window.scrollBy(0, ${delta}); return true;`);
    return { ok: true };
  }

  async close() {
    try {
      if (this.sessionId) await this.request("DELETE", `/session/${this.sessionId}`);
    } catch {}
    this.sessionId = null;
    if (this.process && !this.process.killed) this.process.kill();
    this.process = null;
    this.serverUrl = null;
  }

  async ensureSession() {
    if (!this.fetchImpl) throw new Error("Safari fallback requires Node fetch support.");
    if (!this.serverUrl) {
      await this.execFileImpl(this.executable, ["--version"]);
      this.port = await this.portFactory();
      this.process = this.spawnImpl(this.executable, ["--port", String(this.port)], { stdio: ["ignore", "pipe", "pipe"] });
      this.process.once?.("error", () => {});
      this.serverUrl = `http://127.0.0.1:${this.port}`;
      await this.waitForServer();
    }
    if (!this.sessionId) {
      const value = await this.request("POST", "/session", { capabilities: { alwaysMatch: { browserName: "safari" } } });
      this.sessionId = value.sessionId || value.session_id;
      if (!this.sessionId) throw new Error("Safari WebDriver did not return a session id.");
    }
  }

  async waitForServer(timeoutMs = 5_000) {
    const deadline = this.now() + timeoutMs;
    while (this.now() < deadline) {
      try {
        await this.request("GET", "/status");
        return;
      } catch {
        await delay(100);
      }
    }
    throw new Error("Safari WebDriver is unavailable or Remote Automation is not enabled.");
  }

  async execute(script) {
    const value = await this.request("POST", `/session/${this.sessionId}/execute/sync`, { script, args: [] });
    return value;
  }

  async request(method, endpoint, body) {
    if (!this.serverUrl) throw new Error("Safari WebDriver is not running.");
    const response = await this.fetchImpl(`${this.serverUrl}${endpoint}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.value?.error) {
      const message = payload.value?.message || payload.message || `Safari WebDriver HTTP ${response.status}`;
      throw new Error(message);
    }
    return payload.value ?? payload;
  }

  requireSession() {
    if (!this.sessionId) throw new Error("Safari WebDriver session is not open.");
  }
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => port ? resolve(port) : reject(new Error("Could not allocate a local port for Safari WebDriver.")));
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
