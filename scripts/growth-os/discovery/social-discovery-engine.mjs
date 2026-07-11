import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const outreachLogFile = path.join(root, "data/marketing/social-outreach-log.csv");
const outputFile = path.join(root, "data/growth-os/social-discovery/today-opportunities.json");
const supportedPlatforms = new Set(["Reddit", "LinkedIn", "Quora", "X"]);

export function discoverSocialOpportunities(now = new Date()) {
  const items = fs.existsSync(outreachLogFile)
    ? parseCsv(fs.readFileSync(outreachLogFile, "utf8"))
      .filter(isReplyCandidate)
      .map(toOpportunity)
      .sort(compareOpportunities)
      .slice(0, 5)
    : [];

  const result = {
    generated_at: now.toISOString(),
    source: "data/marketing/social-outreach-log.csv",
    supported_platforms: [...supportedPlatforms],
    items
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

function isReplyCandidate(row) {
  return supportedPlatforms.has(row.platform)
    && /^https?:\/\//i.test(row.url || "")
    && /question identified|discussion identified|reply candidate/i.test(row.content_type || "")
    && /not_replied|identified/i.test(row.response || "")
    && !/removed|published|no_retry/i.test(`${row.response} ${row.lead_status} ${row.follow_up}`);
}

function toOpportunity(row) {
  const score = intentScore(row);
  return {
    platform: row.platform,
    thread_url: row.url,
    author: row.author || "Not recorded",
    topic: row.topic,
    intent_score: score.label,
    intent_rank: score.rank,
    why_relevant: row.notes || "已有明确采购问题，适合补充具体经验。",
    suggested_comment: suggestedComment(row),
    expected_value: expectedValue(row),
    risk_status: row.platform === "Reddit" ? "High" : "Medium",
    risk_note: row.platform === "Reddit"
      ? "只回复原问题，不放链接、不提项目、不发独立推广帖。"
      : "保持经验分享，不使用硬性推广。"
  };
}

function intentScore(row) {
  const text = `${row.topic} ${row.notes} ${row.target_profile}`.toLowerCase();
  if (/deposit|pay supplier|pay manufacturer|payment|bank account|quotation|quote/.test(text)) {
    return { label: "High", rank: 3 };
  }
  if (/sample|order|moq|shipping/.test(text)) return { label: "Medium", rank: 2 };
  return { label: "Low", rank: 1 };
}

function suggestedComment(row) {
  const text = `${row.topic} ${row.notes}`.toLowerCase();
  if (/bank account|personal bank/.test(text)) {
    return "I would ask the supplier to restate the beneficiary name, payment details, and the order scope on the current quotation or pro forma invoice. The point is to make mismatches visible before payment, not to assume the account detail alone proves anything.";
  }
  if (/deposit|pay supplier|pay manufacturer|payment/.test(text)) {
    return "Before paying, I would ask for one clean written summary of the product scope, quantity, price, trade term, what the deposit covers, when the balance is due, and what can change the price or lead time. It makes it easier to spot where both sides may be assuming different things.";
  }
  if (/sample|shipping/.test(text)) {
    return "I would separate the sample fee, shipping, any tooling or printing cost, and what the sample is meant to represent. A stock sample, a custom sample, and a pre-production sample answer different questions before a larger order.";
  }
  return "I would start by separating what the supplier has confirmed from what is still unclear, then ask for the missing point in writing. That usually makes the next decision easier without treating a general reply as proof.";
}

function expectedValue(row) {
  const text = `${row.target_profile} ${row.topic}`.toLowerCase();
  if (/buyer|seller|importer|fba|ecommerce|small business|entrepreneur/.test(text)) return "Buyer";
  if (/partner|agency|consultant/.test(text)) return "Partner";
  if (/audience|observer/.test(text)) return "Audience";
  return "Ignore";
}

function compareOpportunities(left, right) {
  return right.intent_rank - left.intent_rank || left.topic.localeCompare(right.topic);
}

function parseCsv(text) {
  const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift() || "");
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = discoverSocialOpportunities();
  console.log(`Social discovery opportunities: ${result.items.length}`);
  for (const item of result.items) console.log(`- ${item.intent_score} ${item.platform}: ${item.topic}`);
}
