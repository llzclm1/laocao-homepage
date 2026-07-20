import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { draftPlatformContent } from "../growth-os/social-engine/index.mjs";
import { addManualSocialOpportunity, discoverSocialOpportunities, isXProjectRelevant } from "../growth-os/discovery/social-discovery-engine.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = path.join(root, "data/social-agent");
const keywordsFile = path.join(dataDir, "keywords.json");
const viewFile = path.join(dataDir, "view.json");
const publishedDraftsFile = path.join(dataDir, "published-drafts.json");
const lifecycleActionsFile = path.join(dataDir, "opportunity-lifecycle-actions.jsonl");
const discoveryDir = path.join(root, "data/growth-os/social-discovery");
const discoveryViewFile = path.join(discoveryDir, "today-opportunities.json");
const discoveredPostsFile = path.join(discoveryDir, "discovered-posts.json");
const signalsFile = path.join(root, "data/growth-os/runtime/signals-latest.json");
const opportunityPlatforms = new Set(["linkedin", "reddit", "quora", "x"]);
const replyQueueLimit = 20;
const originalQueueLimit = 10;
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
  const discovery = readDiscoveryProjection(now);
  const replyOpportunities = projectDiscoveryCandidates(discovery.items, now);
  const published = new Set(readJson(publishedDraftsFile, []).map((item) => item.draft_id));
  const originalPosts = buildOriginalPostIdeas({
    opportunities: replyOpportunities,
    signals: readJson(signalsFile, { signals: [] }),
    now
  }).slice(0, originalQueueLimit);
  const opportunities = applyOpportunityLifecycle(
    [...replyOpportunities, ...originalPosts],
    readJsonl(lifecycleActionsFile)
  ).sort(compareOpportunityPriority);

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
      automatic_available: replyOpportunities.length > 0 || originalPosts.length > 0,
      message: "Public Discovery candidates are projected from the social-discovery workspace. Review and publish actions remain manual.",
      sources: [
        "data/growth-os/social-discovery/discovered-posts.json",
        "data/growth-os/social-discovery/today-opportunities.json"
      ]
    },
    debug: {
      active_candidates: replyOpportunities.length,
      selected_opportunities: opportunities.length,
      reply_opportunities: replyOpportunities.length,
      original_posts: originalPosts.length,
      source_of_truth: "data/growth-os/social-discovery/",
      rule: "Only real public HTTPS Factory Bridge candidates are shown. No login, cookies, private messages, automated replies, links, or publishing."
    }
  };
}

export function recordSocialAgentLifecycleAction(value, now = new Date()) {
  const id = String(value?.id || "").trim();
  const action = String(value?.action || "").trim();
  const currentView = buildSocialAgentView(now);
  const item = currentView.opportunities.find((candidate) => candidate.id === id);
  if (!item) throw new Error("Opportunity was not found in the unified queue");

  const fromStatus = normalizeLifecycleStatus(item.status);
  const toStatus = transitionForOpportunityAction(fromStatus, action);
  if (!toStatus) throw new Error(`Action ${action} is not available from ${fromStatus}`);

  const entry = {
    id,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    at: now.toISOString(),
    published_at: toStatus === "published" ? now.toISOString() : null,
    published_url: normalizeOptionalUrl(value?.published_url),
    snapshot: lifecycleSnapshot(item)
  };
  fs.mkdirSync(dataDir, { recursive: true });
  fs.appendFileSync(lifecycleActionsFile, `${JSON.stringify(entry)}\n`, "utf8");

  const view = buildSocialAgentView(now);
  writeSocialAgentView(view);
  return { entry, view };
}

export function applyOpportunityLifecycle(items = [], actions = []) {
  const baseItems = Array.isArray(items) ? items : [];
  const latestActions = latestLifecycleActions(actions);
  const seen = new Set();
  const merged = [];

  for (const item of baseItems) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(withLifecycleStatus(item, latestActions.get(item.id)));
  }
  for (const [id, action] of latestActions) {
    if (seen.has(id) || !action.snapshot) continue;
    seen.add(id);
    merged.push(withLifecycleStatus(action.snapshot, action));
  }
  return merged;
}

export function transitionForOpportunityAction(fromStatus, action) {
  const status = normalizeLifecycleStatus(fromStatus);
  const allowed = {
    pending_review: { approve: "approved", archive: "archived" },
    approved: { ready_to_publish: "ready_to_publish", archive: "archived" },
    ready_to_publish: { published: "published", archive: "archived" },
    published: { archive: "archived" }
  };
  return allowed[status]?.[String(action || "").trim()] || null;
}

function latestLifecycleActions(actions) {
  const latest = new Map();
  for (const action of Array.isArray(actions) ? actions : []) {
    if (!action?.id || !action?.to_status || !action?.at) continue;
    const previous = latest.get(action.id);
    if (!previous || Date.parse(action.at) >= Date.parse(previous.at)) latest.set(action.id, action);
  }
  return latest;
}

function withLifecycleStatus(item, action) {
  const status = action?.to_status ? normalizeLifecycleStatus(action.to_status) : normalizeLifecycleStatus(item.status);
  const publishedAt = status === "published" ? (action?.published_at || item.published_at || action?.at || null) : null;
  return {
    ...item,
    status,
    review_status: status,
    lifecycle: {
      status,
      updated_at: action?.at || item.updated_at || item.created_at || item.captured_at || null
    },
    published_at: publishedAt,
    published_url: action?.published_url || item.published_url || null,
    performance: item.performance || { views: null, clicks: null, comments: null, likes: null, ctr: null }
  };
}

function normalizeLifecycleStatus(value) {
  const status = String(value || "pending_review").trim().toLowerCase();
  return ["pending_review", "approved", "ready_to_publish", "published", "archived"].includes(status)
    ? status
    : "pending_review";
}

function lifecycleSnapshot(item) {
  return {
    ...item,
    draft: item.draft || item.suggested_reply || "",
    suggested_reply: item.suggested_reply || item.draft || ""
  };
}

function normalizeOptionalUrl(value) {
  const url = String(value || "").trim();
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function buildOriginalPostIdeas({ opportunities = [], signals = {}, now = new Date() } = {}) {
  const reply = opportunities.find((item) => item.type === "reply_opportunity" && item.business_line === "factory_bridge");
  const factorySignal = (Array.isArray(signals?.signals) ? signals.signals : [])
    .find((item) => item.business_line === "factory_bridge" && item.status !== "archived");
  const ideas = [];
  if (reply) {
    const topic = originalTopicFor(reply);
    ideas.push(originalPostFromEvidence({
      platform: "linkedin",
      topic,
      title: originalTitleFor(reply),
      sourceSignals: [reply.id],
      source: reply.source,
      sourceStatus: reply.source_status,
      sourceUrl: reply.url,
      observedAt: reply.published_at || reply.captured_at,
      evidence: reply.summary,
      relatedPage: "/buyer-guides/verify-chinese-supplier-before-deposit/",
      now
    }));
  } else if (factorySignal) {
    const query = String(factorySignal.payload?.query || factorySignal.title || "supplier communication").trim();
    ideas.push(originalPostFromEvidence({
      platform: "linkedin",
      topic: query,
      title: `What buyers should clarify about ${query}`,
      sourceSignals: [factorySignal.id || factorySignal.event],
      source: factorySignal.source,
      sourceStatus: factorySignal.source_status,
      sourceUrl: null,
      observedAt: factorySignal.observed_at,
      evidence: factorySignal.detail || factorySignal.title,
      relatedPage: "/supplier-reply-review/",
      now
    }));
  }
  return ideas.filter(Boolean).slice(0, 1);
}

function originalPostFromEvidence({ platform, topic, title, sourceSignals, source, sourceStatus, sourceUrl, observedAt, evidence, relatedPage, now }) {
  const normalizedTopic = String(topic || "supplier communication").trim();
  const draft = originalDraftFor(normalizedTopic);
  if (!draft || !sourceSignals.length) return null;
  const id = `POST-${createHash("sha1").update(`${platform}:${sourceSignals.join(",")}:${normalizedTopic}`).digest("hex").slice(0, 12)}`;
  return {
    id,
    type: "original_post",
    business_line: "factory_bridge",
    platform: platformLabels[platform] || platform,
    topic: normalizedTopic,
    source_signals: sourceSignals,
    reason: "根据真实买家讨论或 Factory Bridge 业务信号生成；先提供判断，再决定是否人工发布。",
    target_audience: "overseas_buyers",
    content_type: platform === "quora" ? "answer" : "short_post",
    title,
    draft,
    related_page: relatedPage,
    cta: "Review a Supplier Reply",
    link_allowed: false,
    risk_flags: ["人工审核", "默认不带链接", "不承诺审厂、质量、可靠性或付款安全"],
    status: "pending_review",
    review_status: "pending_review",
    created_at: now.toISOString(),
    evidence: {
      source: source || "social-discovery",
      source_status: sourceStatus || "public_discovery",
      source_url: sourceUrl || null,
      observed_at: observedAt || now.toISOString(),
      supporting_reason: evidence || "真实业务信号"
    }
  };
}

function originalTopicFor(item) {
  const text = `${item.title} ${item.summary}`;
  if (/payment|deposit|bank|费用|付款/i.test(text)) return "payment scope before paying a China supplier";
  if (/quote|quotation|报价/i.test(text)) return "quotation scope before comparing China suppliers";
  if (/sample|样品/i.test(text)) return "sample scope before placing an order";
  return "supplier communication before the next order decision";
}

function originalTitleFor(item) {
  const topic = originalTopicFor(item);
  if (/payment/i.test(topic)) return "Before paying a China supplier, separate the payment scope";
  if (/quotation/i.test(topic)) return "Compare the quotation scope before comparing prices";
  if (/sample/i.test(topic)) return "What should a buyer confirm before ordering samples?";
  return "Make the next supplier question specific";
}

function originalDraftFor(topic) {
  if (/payment/i.test(topic)) return `Before paying a China supplier, separate the payment scope from the payment timing. Ask what the deposit covers, which costs are separate, who receives each payment, and what written condition triggers the next milestone.\n\nA useful record has four columns: confirmed, estimated, missing, and changed. That keeps a supplier reply from sounding more complete than it is. It does not verify a supplier or make payment safe; it gives the buyer a clearer next question before moving forward.`;
  if (/quotation/i.test(topic)) return `A lower China supplier quote may simply include less. Before comparing prices, put the same product scope, quantity, packaging, tooling, trade term, lead-time start, and payment milestones side by side.\n\nMark each line as confirmed, estimated, or still open. The blank cells are not a supplier score; they are the next clarification questions. Compare assumptions before numbers.`;
  if (/sample/i.test(topic)) return `Before ordering a sample, ask what the sample includes: material, dimensions, finish, logo, packaging, shipping, and the event that starts the lead time.\n\nThen ask which details will remain the same for a larger order and which are still assumptions. A sample discussion should make the next question clearer, not promise that the final production will be identical.`;
  return `Before the next supplier decision, separate what the supplier confirmed from what remains unclear. Put the product scope, quotation, sample conditions, delivery timing, and payment terms in one written summary.\n\nThe purpose is not to label a supplier reliable or unreliable. It is to make the next question specific enough for both sides to answer.`;
}

/**
 * Read the new discovery workspace without treating the legacy Social Agent
 * opportunities file as a second source of truth.
 */
export function readDiscoveryProjection(now = new Date()) {
  const view = readJson(discoveryViewFile, null);
  const workspace = view?.workspace || {};
  const workspaceItems = [
    ...(Array.isArray(workspace.inbox) ? workspace.inbox : []),
    ...(Array.isArray(workspace.today) ? workspace.today : [])
  ];
  const items = workspaceItems.length
    ? workspaceItems
    : (Array.isArray(view?.items) && view.items.length ? view.items : readJson(discoveredPostsFile, []));
  return { generated_at: view?.generated_at || null, items, now: now.toISOString() };
}

export function projectDiscoveryCandidates(items, now = new Date()) {
  const seen = new Set();
  const candidates = (Array.isArray(items) ? items : [])
    .filter((item) => isEligibleDiscoveryCandidate(item))
    .filter((item) => {
      const key = String(item.id || item.url || item.thread_url || `${item.platform}:${item.title || item.topic}`).trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => toSocialAgentOpportunity(item, now))
    .filter(Boolean)
    .sort(compareCandidates);
  return candidates.slice(0, replyQueueLimit);
}

function isEligibleDiscoveryCandidate(item = {}) {
  const platform = String(item.platform || "").trim().toLowerCase();
  const terminal = new Set(["ignored", "archived", "replied", "published", "approved", "closed", "removed", "outcome_pending", "received_reply", "buyer_signal", "partner_signal", "review_request", "paid_opportunity"]);
  const pending = new Set(["pending", "inbox", "pending_review", "review_pending", "needs_selection", "today", "viewed", "draft_prepared"]);
  const states = [item.workflow_state, item.status, item.review_status].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
  if (!states.length) states.push("inbox");
  if (!opportunityPlatforms.has(platform) || !isPublicUrl(item.url || item.thread_url) || !String(item.title || item.topic || "").trim()) return false;
  if (states.some((state) => terminal.has(state)) || !states.some((state) => pending.has(state))) return false;
  if (item.expected_value === "Ignore" || item.excluded_reason || item.reddit_trust?.eligible === false) return false;
  const text = [item.title, item.topic, item.snippet, item.reason, item.why_relevant].filter(Boolean).join(" ");
  if (!isFactoryBridgeCandidate(text)) return false;
  if (platform === "x" && !isXProjectRelevant({ title: item.title || item.topic, snippet: text })) return false;
  return true;
}

function isFactoryBridgeCandidate(text = "") {
  const value = String(text);
  if (/\b(?:ai|artificial\s+intelligence|codex|vibe\s*coding|machine\s+learning|llm|gpt|roblox|world\s+cup|block\s+blast|game|hiring|job|career|salary|resume|apics|pfas|study|exam|certification|learning\s+system|college|degree|confidence|3pl|freight|ltl|hs\s+code|pharma|medical|shipping\s+platform)\b/i.test(value)) return false;
  const buyerContext = /\b(?:china|chinese\s+supplier|supplier|sourcing|procurement|factory|manufacturer|alibaba|quotation|quote|sample|moq|payment|deposit|oem|odm|trading\s+company)\b/i.test(value);
  const decisionQuestion = /\b(?:payment|deposit|quotation|quote|sample|moq|lead\s*time|delivery|packaging|supplier\s+reply|supplier\s+communication|stopped\s+replying|not\s+replying|trading\s+company|oem|odm|verify|check|before\s+(?:paying|ordering)|compare)\b/i.test(value);
  return buyerContext && decisionQuestion;
}

function toSocialAgentOpportunity(item, now) {
  const platform = String(item.platform || "").trim().toLowerCase();
  const url = normalizeUrl(item.url || item.thread_url);
  const title = String(item.title || item.topic || "").trim();
  const existingDraft = String(item.suggested_comment || item.suggested_reply || "").trim();
  const sourceText = `${title} ${item.snippet || ""}`;
  const highIntent = /\b(?:payment|deposit|quotation|quote|sample|moq|lead\s*time|delivery|supplier\s+reply|before\s+(?:paying|ordering))\b/i.test(sourceText);
  const suggestedReply = highIntent ? (safeAdapterDraft(platform, item, title) || existingDraft) : (existingDraft || safeAdapterDraft(platform, item, title));
  if (!url || !title || !suggestedReply) return null;
  const riskFlags = [item.risk_status, item.opportunity_risk_status, item.risk_note, item.opportunity_risk_note].filter(Boolean);
  return {
    id: item.id,
    type: "reply_opportunity",
    business_line: "factory_bridge",
    platform: platformLabels[platform] || platform,
    url,
    title,
    topic: String(item.topic || title).trim(),
    author: item.author || "Not recorded",
    published_at: item.published_at || null,
    captured_at: item.discovered_at || item.first_seen_at || now.toISOString(),
    summary: String(item.snippet || "").trim(),
    source: "data/growth-os/social-discovery/today-opportunities.json",
    source_method: item.source_method || "public_discovery",
    source_status: "public_discovery",
    why_relevant: highIntent ? businessReason(sourceText) : (item.why_relevant || item.reason || "公开讨论与 Factory Bridge 的供应商沟通主题相关。"),
    suggested_angle: highIntent ? businessAngle(sourceText) : (item.suggested_angle || "先区分已确认信息与待确认信息，再提出一个具体问题。"),
    suggested_reply: suggestedReply,
    risk_flags: riskFlags,
    risk_note: item.risk_note || item.opportunity_risk_note || "人工审核；默认不带链接、不推广。",
    link_allowed: false,
    status: "pending_review",
    review_status: "pending_review",
    intent_score: item.intent_score || null,
    intent_rank: Number(item.intent_rank) || null,
    business_intent_score: Number.isFinite(Number(item.business_intent_score)) ? Number(item.business_intent_score) : null,
    x_character_count: platform === "x" ? characterCount(suggestedReply) : null
  };
}

function businessReason(text) {
  if (/payment|deposit/i.test(text)) return "买家正在讨论付款范围与费用拆分，适合从付款主体、费用依据和付款节点角度回答。";
  if (/quotation|quote/i.test(text)) return "买家正在比较供应商报价，适合指出报价范围、额外费用和缺失信息。";
  if (/sample/i.test(text)) return "买家正在讨论样品条件，适合澄清样品范围、定制内容和交付时间。";
  return "公开讨论涉及供应商沟通中的具体决策问题，适合提供一个可核对的下一步问题。";
}

function businessAngle(text) {
  if (/payment|deposit/i.test(text)) return "区分货款、差旅或安装等费用，确认付款主体、书面依据和付款节点；不做安全保证。";
  if (/quotation|quote/i.test(text)) return "把产品范围、数量、包装、额外费用和交期起算点放在同一比较表中。";
  if (/sample/i.test(text)) return "先确认样品包含的规格、定制、包装和运输，再分别确认制作与运输时间。";
  return "先列出已确认信息和缺失信息，再提出一个具体、可书面确认的问题。";
}

function safeAdapterDraft(platform, item, title) {
  try {
    return draftPlatformContent({
      platform,
      topic: title,
      source_text: item.snippet || item.reason || "",
      source_url: item.url || item.thread_url,
      community_checked: platform === "reddit" ? true : undefined,
      community_allows_links: false
    });
  } catch {
    return "";
  }
}

export function addSocialAgentOpportunity(value, now = new Date()) {
  const url = normalizeUrl(value?.url);
  const topic = String(value?.topic || "").trim();
  if (!url || !topic) throw new Error("A supported public HTTPS URL and topic are required");
  const result = addManualSocialOpportunity({
    platform: value?.platform,
    url,
    topic,
    author: value?.author,
    note: value?.note
  }, now);
  if (result.added) discoverSocialOpportunities(now);
  const view = buildSocialAgentView(now);
  writeSocialAgentView(view);
  return { added: result.added ? [result.candidate] : [], duplicate: result.duplicate, view };
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
  const draft = activeDrafts(readKeywords()).find((item) => item.id === draftId)
    || buildSocialAgentView(now).opportunities.find((item) => item.type === "original_post" && item.id === draftId);
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
  return opportunityPriority(right) - opportunityPriority(left)
    || (rank[right.intent_score] || 0) - (rank[left.intent_score] || 0)
    || Date.parse(right.discovered_at || 0) - Date.parse(left.discovered_at || 0);
}

function compareOpportunityPriority(left, right) {
  return opportunityPriority(right) - opportunityPriority(left)
    || Number(right.business_intent_score || 0) - Number(left.business_intent_score || 0)
    || Date.parse(right.captured_at || right.created_at || 0) - Date.parse(left.captured_at || left.created_at || 0);
}

function opportunityPriority(item = {}) {
  const platform = String(item.platform || "").trim().toLowerCase();
  if (item.type === "seo_opportunity" || item.type === "content_plan") return 100;
  if (platform === "linkedin" && item.type !== "original_post") return 90;
  if (platform === "quora") return 85;
  if (platform === "email" || item.type === "email_opportunity") return 80;
  if (platform === "linkedin" && item.type === "original_post") return 75;
  if (platform === "reddit") return 60;
  return 0;
}

function isPublicUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
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

function wordCount(value) { return String(value).trim().split(/\s+/).filter(Boolean).length; }
function characterCount(value) { return Array.from(String(value)).length; }
function fitCharacters(value, limit) { return characterCount(value) <= limit ? value : `${Array.from(value).slice(0, Math.max(0, limit - 1)).join("").trimEnd()}…`; }
function readJson(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; } catch { return fallback; }
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runSocialAgent(parseArgs(process.argv));
  console.log(`Social Agent: ${result.view.opportunities.length} opportunity(s), ${result.view.drafts.length} draft(s)`);
}
