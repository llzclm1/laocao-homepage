import { linkedin } from "./platforms/linkedin.mjs";
import { medium } from "./platforms/medium.mjs";
import { quora } from "./platforms/quora.mjs";
import { reddit } from "./platforms/reddit.mjs";
import { substack } from "./platforms/substack.mjs";
import { x } from "./platforms/x.mjs";

export { RESULT_TYPES, REVIEW_DECISIONS, normalizeSignal } from "./core.mjs";

export const platformAdapters = Object.freeze({ linkedin, reddit, quora, medium, x, substack });

export function platformAdapter(platform) {
  const key = String(platform || "").trim().toLowerCase().replace("twitter", "x");
  const adapter = platformAdapters[key];
  if (!adapter) throw new Error(`Unsupported platform: ${platform}`);
  return adapter;
}

export function evaluatePlatformSignal(input) {
  return platformAdapter(input.platform).evaluate(input);
}

export function draftPlatformContent(input) {
  return platformAdapter(input.platform).write(input);
}

export function reviewPlatformContent(input, draft) {
  return platformAdapter(input.platform).review(input, draft);
}

export function learnFromPlatformResult(platform, result) {
  return platformAdapter(platform).learn(result);
}
