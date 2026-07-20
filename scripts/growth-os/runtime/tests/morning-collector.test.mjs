import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  classifyClarityExtraction,
  buildTopTasks,
  countSourceStates,
  detectCommonRootCause,
  collectBrowserSourcesWithFallback,
  parseClarityMetrics,
  resolveBrowserActExecutable,
  summarize,
  sourceState,
  waitForClarityMetrics
} from "../morning-collector.mjs";

test("uses the user-local browser-act binary when the server PATH cannot find it", () => {
  const home = "/Users/example";
  const localBinary = path.join(home, ".local/bin/browser-act");
  const resolved = resolveBrowserActExecutable({
    env: { PATH: "/usr/bin:/bin" },
    home,
    exists: (file) => file === localBinary
  });

  assert.equal(resolved, localBinary);
});

test("prefers an explicitly configured browser-act binary", () => {
  const resolved = resolveBrowserActExecutable({
    env: { BROWSER_ACT_BIN: "/opt/tools/browser-act" },
    home: "/Users/example",
    exists: (file) => file === "/opt/tools/browser-act"
  });

  assert.equal(resolved, "/opt/tools/browser-act");
});

test("extracts Clarity metrics from stable labels without class names", () => {
  const text = `
    会话
    32
    15 排除机器人会话
    每个会话的页面数
    1.34
    滚动深度
    41.44%
    所用的活动时间
    14 秒
    唯一用户数
    6
    无效点击
    20%
    2 个会话
    强烈点击
    0%
    0 个会话
  `;

  assert.deepEqual(parseClarityMetrics(text), {
    sessions: 32,
    sessions_excluding_bots: 15,
    unique_users: 6,
    pages_per_session: 1.34,
    scroll_depth: "41.44%",
    active_time: "14 秒",
    dead_clicks: "20%",
    dead_click_sessions: 2,
    rage_clicks: "0%",
    rage_click_sessions: 0
  });
});

test("stops finite Clarity polling as soon as a core metric appears", async () => {
  const states = [
    { url: "https://clarity.microsoft.com/projects/view/test/dashboard", text: "正在加载" },
    { url: "https://clarity.microsoft.com/projects/view/test/dashboard", text: "会话\n12\n10 排除机器人会话" }
  ];
  let reads = 0;
  let scrolls = 0;
  let waits = 0;

  const result = await waitForClarityMetrics({
    maxAttempts: 5,
    readState: async () => states[Math.min(reads++, states.length - 1)],
    scroll: async () => { scrolls += 1; },
    sleep: async () => { waits += 1; }
  });

  assert.equal(result.status, "partial");
  assert.equal(result.metrics.sessions, 12);
  assert.equal(reads, 2);
  assert.equal(scrolls, 1);
  assert.equal(waits, 1);
  assert.equal(result.diagnostics.scrolled, true);
});

test("classifies missing Clarity metrics without blocking an opened page", () => {
  const result = classifyClarityExtraction({}, { pageOpened: true, timedOut: true });

  assert.equal(result.status, "extraction_failed");
  assert.deepEqual(result.missing_metrics, [
    "sessions",
    "unique_users",
    "pages_per_session_or_scroll_depth",
    "active_time",
    "dead_clicks",
    "rage_clicks"
  ]);
});

test("classifies one extracted Clarity core metric as collected", () => {
  const result = classifyClarityExtraction({ sessions: 12 }, { pageOpened: true, timedOut: false });

  assert.equal(result.status, "partial");
  assert.ok(result.found_labels.includes("sessions"));
  assert.ok(result.missing_metrics.includes("dead_clicks"));
});

test("records a bounded Clarity timeout stage when metrics never arrive", async () => {
  const stages = [];
  const result = await waitForClarityMetrics({
    maxAttempts: 20,
    maxWaitMs: 20,
    pollMs: 10,
    readState: async () => ({ url: "https://clarity.microsoft.com/projects/view/test/dashboard", text: "正在加载" }),
    scroll: async () => {},
    sleep: async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    onStage: (stage) => stages.push(stage)
  });

  assert.equal(result.status, "extraction_failed");
  assert.ok(stages.includes("clarity_waiting"));
  assert.ok(stages.includes("clarity_timeout"));
  assert.ok(result.diagnostics.wait_ms <= 100);
});

test("does not promote Clarity extraction failure into a top task", () => {
  const tasks = buildTopTasks([
    { key: "clarity", label: "Microsoft Clarity", status: "blocked", metrics: {} },
    { key: "semrush", label: "Semrush", status: "collected", metrics: {} },
    { key: "conversion", label: "Website conversion", status: "collected", metrics: { material_submitted: 0 } }
  ]);

  assert.equal(tasks.some((task) => task.title.includes("采集阻塞") || task.reason.includes("Clarity")), false);
});

test("does not promote social collection failure into a top task", () => {
  const tasks = buildTopTasks([
    { key: "social", label: "Social platforms", status: "blocked", metrics: {} },
    { key: "semrush", label: "Semrush", status: "collected", metrics: {} },
    { key: "conversion", label: "Website conversion", status: "collected", metrics: { material_submitted: 0 } }
  ]);

  assert.equal(tasks.some((task) => task.title.includes("采集阻塞") || task.reason.includes("社交")), false);
});

test("does not count Clarity failure as a blocked-source summary", () => {
  const summary = summarize([
    { key: "clarity", state: "unavailable" },
    { key: "semrush", state: "live" },
    { key: "gsc", state: "unavailable" }
  ]);

  assert.equal(summary.counts.live, 1);
  assert.equal(summary.counts.unavailable, 2);
  assert.equal(summary.clarity_unavailable, true);
  assert.match(summary.conclusion, /Clarity 数据暂未提取，不影响其他数据/);
});

test("groups repeated Browser Act permission failures into one Chrome root cause", () => {
  const sources = ["cloudflare", "gsc", "clarity", "semrush"].map((key) => ({
    key,
    label: key,
    state: "unavailable",
    diagnostics: { technical_error: "Operation not permitted (error_code: 230404)" }
  }));

  const rootCause = detectCommonRootCause(sources);

  assert.deepEqual(rootCause, {
    code: "chrome_permission",
    label: "Chrome 权限未授权",
    affected_sources: ["cloudflare", "gsc", "clarity", "semrush"]
  });
});

test("counts live, cached, manual, permission-required, and unavailable separately", () => {
  const sources = [
    { state: "live" },
    { state: "cached" },
    { state: "manual" },
    { state: "permission_required" },
    { state: "unavailable" }
  ];

  assert.deepEqual(countSourceStates(sources), {
    live: 1,
    cached: 1,
    manual: 1,
    unavailable: 1,
    permission_required: 1,
    uncollected: 2
  });
});

test("does not expose legacy collected or blocked state as the canonical source state", () => {
  assert.equal(sourceState({ status: "collected", realtime: true }), "live");
  assert.equal(sourceState({ status: "collected", realtime: false, note: "Existing local manual/import record" }), "cached");
  assert.equal(sourceState({ status: "blocked" }), "unavailable");
});

test("creates one Chrome authorization task for repeated permission failures", () => {
  const sources = ["cloudflare", "gsc", "clarity", "semrush"].map((key) => ({
    key,
    label: key,
    state: "permission_required",
    diagnostics: { technical_error: "Operation not permitted (error_code: 230404)" },
    metrics: {}
  }));

  const tasks = buildTopTasks(sources);

  assert.equal(tasks.filter((task) => task.title.includes("授权")).length, 1);
  assert.equal(tasks[0].title, "重新授权 Chrome 后再次采集");
});

test("routes Chrome failures to Safari and records the fallback adapter", async () => {
  const result = await collectBrowserSourcesWithFallback({
    findChrome: async () => { throw new Error("Operation not permitted (error_code: 230404)"); },
    safariAdapterFactory: () => ({ kind: "safari" }),
    runGroup: async (adapter) => ({
      adapter,
      error: null,
      sources: [
        { key: "cloudflare", state: "live", status: "live", adapter: adapter.kind },
        { key: "gsc", state: "live", status: "live", adapter: adapter.kind },
        { key: "clarity", state: "live", status: "live", adapter: adapter.kind },
        { key: "semrush", state: "live", status: "live", adapter: adapter.kind }
      ]
    })
  });

  assert.equal(result.context.used, "safari");
  assert.equal(result.context.fallback, true);
  assert.equal(result.context.public_note, "Chrome 不可用，本轮已自动切换 Safari。");
  assert.deepEqual(result.sources.map((source) => source.adapter), ["safari", "safari", "safari", "safari"]);
});
