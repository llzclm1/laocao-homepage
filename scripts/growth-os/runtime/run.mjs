import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { run as runContentAgent } from "../agents/content-agent/interface.mjs";
import { run as runOpportunityAgent } from "../agents/opportunity-agent/interface.mjs";
import { run as runResearchAgent } from "../agents/research-agent/interface.mjs";
import { runContentQuality } from "../content-quality/run.mjs";
import { generateGoPackages } from "../content/go-package-generator.mjs";
import { loadAllOpportunities } from "../decision/business-intent-agent.mjs";
import { rankBusinessOpportunities } from "../decision/priority-ranker.mjs";
import { adaptPlatformContent } from "../distribution/platform-adaptation-agent.mjs";
import { runPlatformCompliance } from "../distribution/platform-compliance-agent.mjs";
import { runGeoEngine } from "../geo/run.mjs";
import { analyzeCloudflareTraffic } from "../import/cloudflare-traffic-analyzer.mjs";
import { runInternalLinks } from "../internal-links/run.mjs";
import { generatePerformanceReport } from "../performance/performance-analyzer.mjs";
import { runInternalSignalAgent } from "../radar/internal-signal-agent.mjs";
import { runNewsRssAgent } from "../radar/news-rss-agent.mjs";
import { runRedditRssAgent } from "../radar/reddit-rss-agent.mjs";
import { discoverSocialOpportunities } from "../discovery/social-discovery-engine.mjs";
import { processReviewActions } from "../review/review-action-processor.mjs";
import { generateReviewQueue } from "../review/review-queue-generator.mjs";
import { analyzeSocialPerformance } from "../social-feedback/social-performance-analyzer.mjs";
import { validateGrowthState } from "../state-machine/state-validator.mjs";
import { writeDashboard } from "./dashboard-generator.mjs";
import { scoreAndDecide } from "./decision-engine.mjs";
import { writeMorningReport } from "./morning-report.mjs";
import { createRunContext } from "./scheduler.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const opportunitiesFile = path.join(root, "data/growth-os/opportunities.jsonl");
const customerMemoryDir = path.join(root, "data/growth-os/customer-memory");
const assetsFile = path.join(root, "data/growth-os/assets/field-materials.json");
const experimentsFile = path.join(root, "docs/growth-os/experiments/active-experiments.md");
const reviewActionsFile = path.join(root, "data/growth-os/actions/review-actions.jsonl");
const runtimeDir = path.join(root, "data/growth-os/runtime");
const stateFile = path.join(runtimeDir, "runtime-state.json");
const decisionLogFile = path.join(runtimeDir, "decision-log.jsonl");

export function runRuntime(argv = process.argv, now = new Date()) {
  const context = createRunContext(argv, now);
  const existingOpportunities = readJsonl(opportunitiesFile);
  const customerMemory = loadCustomerMemory();
  const customerSignals = toOpportunitySignals(customerMemory.buyerSignals, customerMemory.factorySignals);
  const radarSignals = [
    ...runRedditRssAgent(),
    ...runNewsRssAgent(),
    ...runInternalSignalAgent(),
    ...customerSignals
  ];
  const decisions = scoreAndDecide(radarSignals, existingOpportunities);
  const highPriority = decisions.filter((item) => item.decision === "high_priority");
  const mediumPriority = decisions.filter((item) => item.decision === "medium_priority");
  const archived = decisions.filter((item) => item.decision === "archive");

  runOpportunityAgent();
  for (const item of [...highPriority, ...mediumPriority]) {
    runResearchAgent(item.id);
    runContentAgent(item.id);
  }

  const geo = runGeoEngine(context.dryRun ? ["node", "scripts/growth-os/geo/run.mjs", "--dry-run"] : ["node", "scripts/growth-os/geo/run.mjs"], now);
  const packageTargets = [...highPriority, ...mediumPriority].map((item) => ({
    ...item,
    status: "draft_ready"
  }));
  const packages = generateGoPackages(packageTargets, { dryRun: context.dryRun });
  const businessRanking = rankBusinessOpportunities([...loadAllOpportunities(), ...existingOpportunities, ...packageTargets], {
    now,
    writeScores: !context.dryRun
  });
  const reviewState = processReviewActions({ now });
  const stateValidation = validateGrowthState(packageTargets);
  const reviewQueue = context.dryRun ? {
    output: "not written in dry-run",
    needsReview: reviewState.items.filter((item) => item.status === "review_pending").length
  } : generateReviewQueue(now);
  const cloudflareTraffic = analyzeCloudflareTraffic(now);
  const performance = generatePerformanceReport(now);
  const contentQuality = runContentQuality(now);
  const internalLinks = runInternalLinks(now);
  const socialContent = adaptPlatformContent(now);
  const platformCompliance = runPlatformCompliance(now);
  const socialPerformance = analyzeSocialPerformance(now);
  const socialDiscovery = discoverSocialOpportunities(now);
  const assetMetadata = loadAssetMetadata();
  const experiments = loadExperimentStatus();
  const reviewActions = readJsonl(reviewActionsFile);
  const summary = {
    date: context.date,
    dry_run: context.dryRun,
    new_opportunities: decisions.length,
    high_priority: highPriority,
    medium_priority: mediumPriority,
    archived,
    need_review: reviewQueue.needsReview,
    review_queue: reviewQueue.output,
    generated_packages: packages,
    review_state: reviewState,
    state_validation: stateValidation,
    geo_report: geo.report,
    geo_queries: geo.queries.length,
    geo_tasks: geo.tasks.length,
    business_opportunities: businessRanking,
    cloudflare_traffic: cloudflareTraffic,
    performance_report: performance.output,
    customer_signals: customerMemory,
    content_quality: contentQuality,
    internal_links: internalLinks,
    social_content: socialContent,
    platform_compliance: platformCompliance,
    social_performance: socialPerformance,
    social_discovery: socialDiscovery,
    review_actions: reviewActions,
    assets: assetMetadata,
    experiments,
    recommended_actions: decisions
      .filter((item) => item.decision !== "archive")
      .map((item) => item.recommended_action)
  };
  const morningReport = writeMorningReport(summary, context);
  const dashboard = writeDashboard(summary, context);

  if (!context.dryRun) {
    writeRuntimeState(summary, morningReport, dashboard);
  }

  return {
    ...summary,
    morning_report: morningReport,
    dashboard
  };
}

function writeRuntimeState(summary, morningReport, dashboard) {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify({
    last_run: summary.date,
    new_opportunities: summary.new_opportunities,
    high_priority: summary.high_priority.map((item) => item.id),
    medium_priority: summary.medium_priority.map((item) => item.id),
    archived: summary.archived.map((item) => item.id),
    geo_report: summary.geo_report,
    business_opportunities: summary.business_opportunities.slice(0, 5).map((item) => ({
      id: item.id,
      final_priority: item.final_priority,
      priority: item.priority
    })),
    customer_signals: summary.customer_signals.total,
    content_quality_average: summary.content_quality.average,
    internal_link_suggestions: summary.internal_links.count,
    social_posts: summary.social_content.posts,
    platform_compliance_passed: summary.platform_compliance.compliance_passed,
    platform_compliance_need_revision: summary.platform_compliance.need_revision,
    social_best_content: summary.social_performance.best_content,
    cloudflare_traffic: summary.cloudflare_traffic.levels,
    assets: summary.assets.count,
    experiments_running: summary.experiments.running,
    morning_report: morningReport,
    dashboard
  }, null, 2)}\n`, "utf8");

  for (const item of [...summary.high_priority, ...summary.medium_priority, ...summary.archived]) {
    fs.appendFileSync(decisionLogFile, `${JSON.stringify({
      date: summary.date,
      id: item.id,
      title: item.title,
      score: item.score,
      decision: item.decision,
      source: item.source
    })}\n`, "utf8");
  }
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadCustomerMemory() {
  const buyerSignals = readJsonl(path.join(customerMemoryDir, "buyer-signals.jsonl"));
  const factorySignals = readJsonl(path.join(customerMemoryDir, "factory-signals.jsonl"));
  const contentFeedback = readJsonl(path.join(customerMemoryDir, "content-feedback.jsonl"));
  return {
    buyerSignals,
    factorySignals,
    contentFeedback,
    total: buyerSignals.length + factorySignals.length + contentFeedback.length
  };
}

function toOpportunitySignals(buyerSignals, factorySignals) {
  return [...buyerSignals, ...factorySignals].map((item, index) => ({
    id: `CS-${String(index + 1).padStart(3, "0")}`,
    source: `customer-memory:${item.source || "manual"}`,
    title: item.question,
    question: item.question,
    intent: item.stage || "customer signal",
    buyer_intent: scoreStage(item.stage),
    commercial_value: scorePain(item.pain),
    content_gap: !item.related_go,
    service_alignment: true,
    boundary_fit: true,
    topic: item.pain || item.stage || "customer signal"
  }));
}

function scoreStage(stage) {
  if (stage === "pre_payment") return 96;
  if (stage === "sample_order" || stage === "quote_review") return 90;
  if (stage === "factory_materials") return 78;
  return 70;
}

function scorePain(pain) {
  const text = String(pain || "").toLowerCase();
  if (text.includes("trust") || text.includes("deposit")) return 92;
  if (text.includes("unclear") || text.includes("quote")) return 88;
  if (text.includes("materials")) return 78;
  return 70;
}

function loadAssetMetadata() {
  const data = readJson(assetsFile, { items: [] });
  return {
    count: (data.items || []).length,
    updated_at: data.updated_at || "unknown",
    output: path.relative(root, assetsFile)
  };
}

function loadExperimentStatus() {
  const text = fs.existsSync(experimentsFile) ? fs.readFileSync(experimentsFile, "utf8") : "";
  const running = (text.match(/Decision:\s*continue/gi) || []).length;
  return {
    running,
    output: path.relative(root, experimentsFile)
  };
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runRuntime(process.argv);
  console.log("Growth OS Autonomous Runtime");
  console.log(`Mode: ${result.dry_run ? "dry-run" : "live"}`);
  console.log(`Date: ${result.date}`);
  console.log(`New opportunities: ${result.new_opportunities}`);
  console.log(`High priority: ${result.high_priority.length}`);
  console.log(`Need review: ${result.need_review}`);
  console.log(`GEO report: ${result.geo_report}`);
  console.log(`Business opportunities: ${result.business_opportunities.length}`);
  console.log(`Morning report: ${result.morning_report}`);
  console.log(`Dashboard: ${result.dashboard}`);
  console.log(`Performance report: ${result.performance_report}`);
  console.log(`Traffic intelligence: crawler=${result.cloudflare_traffic.levels.crawler_traffic}, legacy=${result.cloudflare_traffic.levels.legacy_traffic}, buyer=${result.cloudflare_traffic.levels.buyer_intent_traffic}, health=${result.cloudflare_traffic.levels.site_health}`);
  console.log(`Customer signals: ${result.customer_signals.total}`);
  console.log(`Content quality average: ${result.content_quality.average}`);
  console.log(`Internal link suggestions: ${result.internal_links.count}`);
  console.log(`Social posts generated: ${result.social_content.posts}`);
  console.log(`Platform compliance passed: ${result.platform_compliance.compliance_passed}`);
  console.log(`Platform compliance need revision: ${result.platform_compliance.need_revision}`);
  console.log(`Social best content: ${result.social_performance.best_content}`);
  console.log(`Social discovery opportunities: ${result.social_discovery.items.length}`);
  console.log(`Assets indexed: ${result.assets.count}`);
  console.log(`Experiments running: ${result.experiments.running}`);
  console.log(`GO packages: ${result.generated_packages.length}`);
  console.log(`State errors: ${result.state_validation.errors.length}`);
  console.log("Recommended actions:");
  for (const action of result.recommended_actions) console.log(`- ${action}`);
  console.log("Top business opportunities:");
  for (const item of result.business_opportunities.slice(0, 5)) console.log(`- ${item.id}: ${item.priority} final=${item.final_priority} conversion=${item.conversion_probability}`);
}
