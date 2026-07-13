import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = path.join(root, "data/social-agent");
const keywordsFile = path.join(dataDir, "keywords.json");
const viewFile = path.join(dataDir, "view.json");
const publishedDraftsFile = path.join(dataDir, "published-drafts.json");
const opportunitiesFile = path.join(dataDir, "opportunities.json");
const opportunityPlatforms = new Set(["linkedin", "reddit", "quora", "x", "facebook"]);
const platformLabels = {
  linkedin: "LinkedIn",
  reddit: "Reddit",
  quora: "Quora",
  x: "X",
  facebook: "Facebook"
};

export async function runSocialAgent(options = {}) {
  const now = options.now || new Date();
  const view = buildSocialAgentView(now);
  if (!options.dryRun) writeSocialAgentView(view);
  return { view, collection: null };
}

export function buildSocialAgentView(now = new Date()) {
  const keywords = readKeywords();
  const candidates = readJson(opportunitiesFile, [])
    .filter((item) => item.status !== "ignored" && opportunityPlatforms.has(item.platform) && isPublicUrl(item.url) && isReviewedCandidate(item))
    .sort(compareCandidates);
  const usedByPlatform = new Map();
  const opportunities = [];
  for (const item of candidates) {
    const current = usedByPlatform.get(item.platform) || 0;
    if (current >= 3 || opportunities.length >= 10) continue;
    usedByPlatform.set(item.platform, current + 1);
    opportunities.push({
      id: item.id,
      platform: platformLabels[item.platform],
      url: item.url,
      title: item.title || item.topic,
      topic: item.topic || item.title,
      author: item.author || "Not recorded",
      source: "Manual URL",
      review_status: "Manual review required",
      suggested_reply: item.suggested_reply,
      x_character_count: item.platform === "x" ? characterCount(item.suggested_reply) : null
    });
  }

  const published = new Set(readJson(publishedDraftsFile, []).map((item) => item.draft_id));
  const drafts = activeDrafts(keywords).map((draft) => ({ ...draft, published: published.has(draft.id) }));
  return {
    generated_at: now.toISOString(),
    title: "Social Content Agent",
    keywords,
    opportunities,
    drafts,
    reddit_trust: {
      mode: "trust_building",
      goal: "Build account reputation",
      promotion_allowed: false,
      link_allowed: false,
      target: "zero_removed_comments",
      metrics: { comments_posted: 10, removed_count: 7, removal_rate: 70, target_comments: 50, community_participation: 10 }
    },
    collection: {
      automatic_available: false,
      message: "Automatic public discovery is unavailable. Use verified manual URLs.",
      sources: []
    },
    debug: {
      active_candidates: candidates.length,
      selected_opportunities: opportunities.length,
      rule: "Only public HTTPS URLs are shown. No login, cookies, private messages, automated replies, or publishing."
    }
  };
}

export function addSocialAgentOpportunity(value, now = new Date()) {
  const url = normalizeUrl(value?.url);
  const platform = detectPlatform(value?.platform, url);
  const topic = String(value?.topic || "").trim();
  if (!url || !platform || !topic) throw new Error("A supported public HTTPS URL and topic are required");
  const records = readJson(opportunitiesFile, []);
  if (records.some((item) => normalizeUrl(item.url) === url)) return { added: [], duplicate: true, view: buildSocialAgentView(now) };
  const record = {
    id: `SOC-${hash(url)}`,
    platform,
    url,
    title: topic,
    topic,
    author: String(value?.author || "").trim() || "Not recorded",
    note: String(value?.note || "").trim(),
    suggested_reply: suggestedReply(platform, topic, value?.note),
    status: "pending",
    discovered_at: now.toISOString(),
    source_method: "manual"
  };
  records.push(record);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(opportunitiesFile, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  const view = buildSocialAgentView(now);
  writeSocialAgentView(view);
  return { added: [record], duplicate: false, view };
}

export function saveSocialAgentKeywords(value, now = new Date()) {
  const raw = Array.isArray(value?.keywords) ? value.keywords : String(value?.keywords || "").split(/\r?\n/);
  const keywords = [...new Set(raw.map((item) => String(item).trim()).filter(Boolean))];
  if (!keywords.length) throw new Error("At least one keyword is required");
  if (keywords.length > 40 || keywords.some((item) => item.length > 100)) throw new Error("Keywords are too long");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(keywordsFile, `${JSON.stringify({ keywords }, null, 2)}\n`, "utf8");
  const view = buildSocialAgentView(now);
  writeSocialAgentView(view);
  return view;
}

export function markSocialAgentDraftPublished(value, now = new Date()) {
  const draftId = String(value?.draft_id || "").trim();
  const draft = activeDrafts(readKeywords()).find((item) => item.id === draftId);
  if (!draft) throw new Error("Unknown draft");
  const records = readJson(publishedDraftsFile, []).filter((item) => item.draft_id !== draftId);
  records.push({ draft_id: draft.id, platform: draft.platform, marked_at: now.toISOString(), mode: "manual" });
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(publishedDraftsFile, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  const view = buildSocialAgentView(now);
  writeSocialAgentView(view);
  return view;
}

function writeSocialAgentView(view) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(viewFile, `${JSON.stringify(view, null, 2)}\n`, "utf8");
}

function readKeywords() {
  const value = readJson(keywordsFile, { keywords: [] });
  return [...new Set((Array.isArray(value.keywords) ? value.keywords : [])
    .map((item) => String(item).trim())
    .filter(Boolean))];
}

function activeDrafts(keywords) {
  const linkedin = `Two supplier quotations can look comparable because both show a unit price. The comparison becomes useful only after the scope is normalized.\n\nFor China sourcing, I would put these lines side by side before choosing a lower number: the same material and finish, the same quantity and MOQ, packaging and accessories, tooling or printing, sample and shipping charges, trade term, destination, lead-time start, price validity, and payment schedule.\n\nA cheaper quote may simply include less. Asking each supplier to restate inclusions and exclusions gives both sides a chance to correct an assumption while the order is still flexible.\n\nI would also record which lines are confirmed, which are estimates, and which changed from the previous quotation. That small version history makes later sample, packaging, and payment discussions easier to follow. This is not a supplier verification claim. It is a way to make the commercial conversation easier to compare.\n\nWhich quotation line do you always normalize first?`;
  const x = fitCharacters("Before comparing China supplier quotes, normalize the scope: same material, quantity, packaging, trade term, lead-time start, and extra charges. A lower unit price may simply include less. Compare assumptions before numbers.", 280);
  const drafts = [
    { id: "linkedin-quote-comparison", platform: "LinkedIn", title: "Compare supplier quotations beyond the unit price", type: "Post", draft: linkedin, word_count: wordCount(linkedin), publish_url: "https://www.linkedin.com/feed/?shareActive=true" },
    { id: "x-quote-comparison", platform: "X", title: "Compare assumptions before numbers", type: "Post", draft: x, character_count: characterCount(x), publish_url: "https://x.com/compose/post" },
    { id: "medium-quote-comparison", platform: "Medium", title: "How to compare China supplier quotations beyond the unit price", type: "Article draft", draft: mediumArticle(), word_count: wordCount(mediumArticle()), publish_url: "https://medium.com/new-story" },
    { id: "substack-quote-comparison", platform: "Substack", title: "The cheapest supplier quote may be the least comparable", type: "Newsletter draft", draft: substackNewsletter(), word_count: wordCount(substackNewsletter()), publish_url: "https://substack.com/publish/post" },
    { id: "quora-quote-comparison", platform: "Quora", title: "How should I compare Alibaba supplier quotations?", type: "Answer draft", draft: quoraAnswer(), word_count: wordCount(quoraAnswer()), publish_url: "https://www.quora.com/" },
    { id: "facebook-quote-comparison", platform: "Facebook", title: "A lower supplier quote may include less", type: "Post", draft: facebookPost(), word_count: wordCount(facebookPost()), publish_url: "https://www.facebook.com/" }
  ];
  return drafts;
}

function mediumArticle() {
  return [
    `# How to compare China supplier quotations beyond the unit price`,
    `A supplier quotation looks precise because it contains a number. That number is only useful when the scope behind it is visible. Two suppliers can quote the same product name while describing different materials, finishes, packaging, quantities, or delivery terms. A lower unit price may simply include less.`,
    `Start by making the product comparable. Write down the material, dimensions, finish, color, logo, accessories, packaging, and any approved drawing or sample reference. If one supplier says “standard material” and another names a grade, the two quotes are not yet on the same basis. Ask both suppliers to define the line instead of guessing what standard means.`,
    `Next, normalize quantity. A unit price at 5,000 pieces is not directly comparable with a price at 500. Check the MOQ, price breaks, setup quantities, and whether the quote assumes a full carton, pallet, or container. Small-order pricing may also include a setup or tooling charge that disappears at higher volume.`,
    `Then list the costs outside the headline number. Tooling, printing plates, custom packaging, samples, inspection, inland transport, export handling, and shipping can sit in separate lines or remain unstated. The right question is not “is shipping included?” It is “which shipping leg and service level does this quote include?”`,
    `Delivery terms need the same treatment. Compare the trade term, destination, lead time, validity period, and the event that starts the production clock. “Thirty days” could mean thirty days after deposit, artwork approval, material arrival, or sample confirmation. Those are different commitments even when the calendar number is identical.`,
    `Payment terms can change the practical cost of a quote. Note the deposit percentage, balance milestone, payment currency, bank charges, and which document carries the current beneficiary details. A clear comparison records these items as commercial terms, not as a judgment about whether the supplier is reliable.`,
    `After normalizing the lines, send the same short clarification to every supplier: “Please confirm the included product scope, quantity basis, packaging, extra charges, trade term, lead-time start, validity, and payment milestones for this quotation.” A consistent question makes the answers easier to compare and gives the supplier a fair chance to correct an assumption.`,
    `Separate firm terms from estimates. Freight may remain an estimate while a material price is firm for seven days. A lead time may depend on artwork approval, sample confirmation, or the arrival of a custom component. Marking each line as confirmed, estimated, or pending prevents a temporary number from becoming an accidental promise later.`,
    `Version control matters when quotations arrive through email, platform chat, and revised files. Give every quote a date or version name, and keep the clarification reply beside it. When a supplier changes the price, ask which product, packaging, delivery, or payment assumption changed. This prevents details from different versions being mixed into an offer that nobody actually made.`,
    `For a first order, the comparison can stay simple. Use one row for each commercial point and one column for each supplier. Do not convert missing information into a score. Leave the cell open and ask the question. An empty field is useful because it shows exactly where the next conversation should focus.`,
    `The lowest price may still be the right choice after the scope is normalized. The purpose is not to favor the most expensive supplier. It is to understand what each number buys, what remains flexible, and whether the order can be described consistently before money or production decisions move forward.`,
    `Before closing the comparison, ask each supplier to confirm the latest version in one message. The reply should identify the quotation date, product version, quantity, packaging basis, trade term, lead-time trigger, and payment milestones. This final written summary does not replace contracts or inspection, but it reduces the chance that the buyer and supplier move forward using different versions of the same order.`,
    `The output should be a comparison sheet with three columns: confirmed, unclear, and changed from the previous quote. This is more useful than a single score because it keeps the information gap visible. If the material is confirmed but packaging is open, the next action is a packaging question, not a confident conclusion about the lowest price.`,
    `This method does not verify a supplier, audit a factory, inspect quality, or make payment safe. It is a communication habit for reducing ambiguity in the order being discussed. Specialist due diligence, contracts, testing, inspection, and legal advice may still be needed for the product and transaction.`,
    `Before choosing a quotation, ask whether both sides can point to the same written scope and explain the same price. If they cannot, the next useful step is not another price comparison. It is a clearer question that makes the quotes genuinely comparable.`,
    `Cao works with Chinese factories and overseas buyers, focusing on supplier communication, quotation clarity, and factory information.\n\nHe is building Gewuji Factory Bridge:\nhttps://gewuji.dev/`
  ].join("\n\n");
}

function substackNewsletter() {
  return [
    `# The cheapest supplier quote may be the least comparable`,
    `A low unit price is attractive because it looks like a clear answer. But supplier quotations are often built from different assumptions. One may include packaging and another may not. One may price a custom finish while another assumes a standard version. The numbers are not useful until the scope is aligned.`,
    `I start by copying the lines from each quotation into the same order: product version, material, finish, quantity, MOQ, packaging, accessories, tooling, printing, shipping, trade term, lead time, validity, and payment schedule. The point is not to create a complicated spreadsheet. It is to make omissions visible.`,
    `Quantity is an easy place to make a false comparison. A supplier quoting 5,000 pieces may spread setup costs across a larger run than a supplier quoting 500. Ask whether the unit price includes a minimum order, a price break, or a one-time setup. The same price at a different quantity does not describe the same decision.`,
    `Delivery terms can hide another difference. “Lead time: 30 days” needs a starting event. Does the clock start after deposit, artwork approval, material confirmation, or sample sign-off? The answer affects the actual schedule more than the number alone.`,
    `I also separate costs that are easy to bury: tooling, custom packaging, sample work, printing, inspection, inland transport, and export handling. A quote can be completely honest and still be hard to compare if these items are scattered across messages or left for a later reply.`,
    `A useful follow-up is neutral and specific: “Could you confirm what is included in this price, which quantity it is based on, what starts the lead-time clock, and which costs are separate?” Ask the same question to every supplier. Consistency improves the comparison and gives each supplier a chance to correct the record.`,
    `I also mark every line as confirmed, estimated, or still open. Freight is often estimated. Material pricing may have a short validity period. Packaging may wait for artwork approval. Those labels stop an early estimate from being remembered later as a fixed commitment.`,
    `Keep quotation versions separate. If the supplier changes the price, ask what changed in the scope and save the revised answer beside the new quote. Mixing an old unit price with new packaging or payment terms creates a comparison that neither side actually offered.`,
    `For a first order, a simple table is enough. Put suppliers in columns and commercial details in rows. Leave missing information blank instead of awarding or subtracting points. The blank cell becomes the next question, keeping the discussion practical without pretending incomplete information is a reliable supplier score.`,
    `Before choosing, ask each supplier to confirm the latest version in one message: quotation date, product version, quantity, packaging basis, trade term, lead-time trigger, and payment milestones. This does not replace contracts, testing, inspection, or specialist due diligence. It simply reduces the chance that two sides continue the same order conversation while referring to different versions of the scope.`,
    `The useful outcome is not certainty about the supplier. It is a cleaner commercial record that shows the next question before the order becomes harder to change.`,
    `The result is not a supplier score. It is a clearer map of what is confirmed, what is different, and what remains open. That map can support a decision about the next sample, clarification, or negotiation without pretending that a quotation proves factory capability or future performance.`,
    `Before selecting the lowest quote, try one test: can you explain why the two prices describe the same product, quantity, inclusions, delivery basis, and payment arrangement? If not, the lower number is a prompt for a better question, not a conclusion.`
  ].join("\n\n");
}

function quoraAnswer() {
  return `I would compare Alibaba supplier quotations by normalizing the scope before comparing the unit price. A simple checklist is:\n\n1. Product: same material, dimensions, finish, color, logo, accessories, and packaging.\n2. Quantity: same order size, MOQ, price break, setup, or tooling basis.\n3. Inclusions: printing, custom packaging, samples, inspection, inland transport, export handling, and shipping.\n4. Delivery: same trade term, destination, lead-time start event, and quote validity.\n5. Payment: currency, deposit and balance milestones, bank charges, and the current quotation or pro forma invoice.\n\nThen ask every supplier the same follow-up: “Please confirm what is included, what is separate, and what event starts the lead time.” A lower quote may simply describe less scope.\n\nI would also label each line as confirmed, estimated, or still open. Freight may be estimated, material pricing may expire after a short period, and production may not start until artwork or sample approval. Keep revised quotations as separate versions so an old price is not accidentally compared with new packaging or payment terms.\n\nThe final comparison does not need a complicated supplier score. A table with suppliers in columns and commercial details in rows is enough. Leave missing information blank and use each blank as the next clarification question. This comparison does not verify a supplier or guarantee quality or delivery; it makes the commercial assumptions visible before the next decision.`;
}

function facebookPost() {
  return `A lower China supplier quote may simply include less. Before comparing prices, put the same lines side by side: material, quantity, packaging, tooling, shipping, trade term, lead-time start, and payment schedule. Compare the assumptions before the numbers. Which line do you always check first?`;
}

function compareCandidates(left, right) {
  const rank = { High: 3, Medium: 2, Low: 1 };
  return (rank[right.intent_score] || 0) - (rank[left.intent_score] || 0)
    || Date.parse(right.discovered_at || 0) - Date.parse(left.discovered_at || 0);
}

function isPublicUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isReviewedCandidate(item) {
  if (!item.suggested_reply || item.source_method !== "manual") return false;
  if (item.platform !== "reddit") return true;
  return !/(https?:\/\/|gewuji|factory bridge|\bDM\b|direct message|message me|contact me|I help buyers|I work with factories)/i.test(item.suggested_reply);
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "example.com"].includes(url.hostname)) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function detectPlatform(input, url) {
  const value = String(input || "").toLowerCase();
  const host = new URL(url).hostname.toLowerCase();
  if (value.includes("linkedin") || host.includes("linkedin.com")) return "linkedin";
  if (value.includes("reddit") || host.includes("reddit.com")) return "reddit";
  if (value.includes("quora") || host.includes("quora.com")) return "quora";
  if (value === "x" || value.includes("twitter") || host === "x.com" || host.includes("twitter.com")) return "x";
  if (value.includes("facebook") || host.includes("facebook.com")) return "facebook";
  return "";
}

function suggestedReply(platform, topic, note) {
  const context = String(note || "").trim() || `The discussion is about ${topic}.`;
  if (platform === "x") return fitCharacters(`${context} A useful distinction is what has been confirmed versus what is still assumed. That usually makes the next question clearer.`, 280);
  if (platform === "reddit") return `${context} One useful detail is to separate what is confirmed from what is still assumed. That makes it easier to ask one specific follow-up without turning the discussion into a pitch.`;
  if (platform === "quora") return `${context}\n\nI would separate the confirmed information from the open assumptions, then turn each open point into a specific question. A short checklist usually works better than a broad judgment: scope, quantity, timing, payment terms, and what could still change.\n\nThis does not prove an outcome. It gives the discussion a clearer next step and makes it easier to compare later replies.`;
  return `${context} One useful way to look at it is to separate what has been confirmed from what is still assumed. That makes the next question more specific and keeps the discussion practical without turning it into a sales pitch.`;
}

function hash(value) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return (result >>> 0).toString(16).padStart(8, "0");
}

function wordCount(value) { return String(value).trim().split(/\s+/).filter(Boolean).length; }
function characterCount(value) { return Array.from(String(value)).length; }
function fitCharacters(value, limit) { return characterCount(value) <= limit ? value : `${Array.from(value).slice(0, Math.max(0, limit - 1)).join("").trimEnd()}…`; }
function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; } catch { return fallback; }
}

function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runSocialAgent(parseArgs(process.argv));
  console.log(`Social Agent: ${result.view.opportunities.length} opportunity(s), ${result.view.drafts.length} draft(s)`);
}
