import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  classifyClarityExtraction,
  buildTopTasks,
  parseClarityMetrics,
  resolveBrowserActExecutable,
  summarize,
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

test("does not count Clarity failure as a blocked-source summary", () => {
  const summary = summarize([
    { key: "clarity", status: "extraction_failed" },
    { key: "semrush", status: "collected" },
    { key: "gsc", status: "blocked" }
  ]);

  assert.equal(summary.blocked, 1);
  assert.equal(summary.clarity_unavailable, true);
  assert.match(summary.conclusion, /Clarity 数据暂未提取，不影响其他数据/);
});
