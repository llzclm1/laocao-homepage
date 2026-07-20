import assert from "node:assert/strict";
import test from "node:test";

import {
  classifySocialPlatform,
  parseLinkedInState,
  parseQuoraState,
  summarizeSocialPlatforms
} from "../social-collector.mjs";

test("parses visible LinkedIn posts, views, notifications, and interaction labels", () => {
  const result = parseLinkedInState(`
    3 条新通知
    动态编号 3
    老曹
    1 天前 •
    I built a small AI assistant for manufacturers.
    12 次展示
    2 条评论
    动态编号 4
    老曹
    2 天前 •
    Two supplier quotations can look comparable.
    7 次展示
  `, "https://www.linkedin.com/in/gewuji/recent-activity/all/");

  assert.equal(result.status, "collected");
  assert.equal(result.latest_posts.length, 2);
  assert.equal(result.latest_posts[0].views, 12);
  assert.equal(result.latest_posts[0].comments, 2);
  assert.equal(result.metrics.notifications, 3);
  assert.equal(result.new_interactions, 3);
});

test("parses Quora answer count, latest answer, followers, and notifications", () => {
  const result = parseQuoraState(`
    雷鸣 曹
    0 followers
    124 Answers
    2 Questions
    3 Posts
    0 unread notifications
    17
    h
    How do professional buyers evaluate an OEM manufacturer before placing an order?
    Upvote
    Comment
  `, "https://www.quora.com/profile/%E9%9B%B7%E9%B8%A3-%E6%9B%B9");

  assert.equal(result.status, "collected");
  assert.equal(result.latest_answers.length, 1);
  assert.equal(result.latest_answers[0].published_at, "17h");
  assert.equal(result.latest_answers[0].question, "How do professional buyers evaluate an OEM manufacturer before placing an order?");
  assert.equal(result.metrics.answers, 124);
  assert.equal(result.metrics.followers, 0);
  assert.equal(result.new_interactions, 0);
});

test("classifies opened social pages with no list as partial, not blocked", () => {
  assert.equal(classifySocialPlatform({ pageOpened: true, items: [], metrics: {} }).status, "partial");
  assert.equal(classifySocialPlatform({ pageOpened: false, items: [], metrics: {} }).status, "blocked");
});

test("summarizes one failed social platform without blocking the other", () => {
  const summary = summarizeSocialPlatforms({
    linkedin: { status: "collected", new_interactions: 2, latest_posts: [{ views: 12 }] },
    quora: { status: "blocked", new_interactions: 0, latest_answers: [] }
  });

  assert.equal(summary.status, "partial");
  assert.equal(summary.new_interactions, 2);
  assert.equal(summary.best_content.platform, "LinkedIn");
});
