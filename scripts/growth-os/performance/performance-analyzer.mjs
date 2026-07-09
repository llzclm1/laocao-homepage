import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConnectorData, summarizeConnectorData } from "./connector-loader.mjs";
import { loadLifecycleState } from "../state/state-manager.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const opportunitiesFile = path.join(root, "data/growth-os/opportunities.jsonl");
const reportFile = path.join(root, "docs/growth-os/performance/content-performance-report.md");
const geoDirs = [
  path.join(root, "docs/geo-monitoring"),
  path.join(root, "docs/growth-os/monitoring")
];

export function generatePerformanceReport(now = new Date()) {
  const opportunities = new Map(readJsonl(opportunitiesFile).map((item) => [item.id, item]));
  const geoFiles = findGeoFiles();
  const connectors = loadConnectorData();
  const connectorSummary = summarizeConnectorData(connectors);
  const items = loadLifecycleState()
    .filter((item) => ["published", "monitoring", "learning"].includes(item.status))
    .map((item) => analyzeItem({ ...item, url: opportunities.get(item.id)?.url || "" }, geoFiles, connectors));
  const markdown = renderReport(now, "data/growth-os/state/content-lifecycle.json", items, geoFiles, connectorSummary);

  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, markdown, "utf8");

  return {
    output: path.relative(root, reportFile),
    publishedContent: items.length,
    monitoringRecords: geoFiles.length,
    improvementSuggestions: items.reduce((count, item) => count + item.improvement_suggestions.length, 0),
    newOpportunitySuggestions: items.reduce((count, item) => count + item.new_opportunity_suggestions.length, 0),
    connectorSummary,
    items
  };
}

function analyzeItem(item, geoFiles, connectors) {
  const signals = connectorSignals(item.url, connectors);
  const monitoring = [];
  if (item.traffic == null) monitoring.push("traffic data missing");
  if (item.ranking == null) monitoring.push("ranking data missing");
  if (item.ai_citation == null) monitoring.push("AI citation not checked");
  if (item.conversion == null) monitoring.push("conversion data missing");
  if (!geoFiles.length) monitoring.push("no GEO report files found");
  if (signals.totalRecords === 0) monitoring.push("no connector records found");

  const improvement = [];
  if (item.status === "published_candidate") improvement.push("Keep in review/monitoring before treating as fully published.");
  if (item.traffic == null || item.ranking == null) improvement.push("Check GSC after indexing window before rewriting.");
  if (item.ai_citation == null) improvement.push("Run manual GEO prompts and record whether the page is mentioned or cited.");
  if (item.conversion == null) improvement.push("Check whether the page leads clearly to Supplier Reply Review, Sample Report, and Examples.");
  if (signals.search.impressions > 0 && signals.search.clicks === 0) improvement.push("Review title, meta, and direct answer after the page has enough search impressions.");
  if (signals.geo.records > 0 && signals.geo.mentions === 0) improvement.push("Strengthen GEO-friendly direct answer and external distribution; current GEO sample has no Gewuji mention.");
  if (signals.traffic.pageviews > 0 && signals.conversions.events === 0) improvement.push("Traffic exists without conversion events; review CTA path.");
  for (const queued of item.optimization_queue || []) improvement.push(queued);

  const newOpportunities = [];
  if (item.ai_citation == null) newOpportunities.push("Create a related direct-answer opportunity if AI answers miss the sample-order question.");
  if (item.conversion == null) newOpportunities.push("Collect buyer follow-up questions from this page before creating the next guide.");
  if (signals.search.topQuery) newOpportunities.push(`Review search query "${signals.search.topQuery}" as a possible follow-up angle.`);

  return {
    ...item,
    connector_signals: signals.summary,
    monitoring_status: monitoring.length ? monitoring.join("; ") : "monitoring data present",
    improvement_suggestions: unique(improvement),
    new_opportunity_suggestions: unique(newOpportunities)
  };
}

function renderReport(now, sourceUpdatedAt, items, geoFiles, connectorSummary) {
  const rows = items.length ? items.map(renderContentItem).join("\n") : "No content status records found.\n";
  const geoSummary = geoFiles.length
    ? geoFiles.map((file) => `- ${path.relative(root, file)}`).join("\n")
    : "- No GEO monitoring report files found yet.";

  return `# Growth OS Content Performance Report

Generated at: ${now.toISOString()}
Content status updated at: ${sourceUpdatedAt || "unknown"}

## Published Content

${rows}
## Monitoring Status

GEO monitoring sources:

${geoSummary}

Connector records:

- Search performance: ${connectorSummary.searchPerformance}
- Traffic performance: ${connectorSummary.trafficPerformance}
- GEO results: ${connectorSummary.geoResults}
- Cloudflare: ${connectorSummary.trafficSecurity}
- Conversions: ${connectorSummary.conversions}

## Improvement Suggestions

${renderSuggestionList(items, "improvement_suggestions")}

## New Opportunity Suggestions

${renderSuggestionList(items, "new_opportunity_suggestions")}
`;
}

function renderContentItem(item) {
  return `### ${item.id}

- URL: ${item.url}
- Status: ${item.status}
- Publish date: ${item.publish_date || "unknown"}
- Traffic: ${formatValue(item.traffic)}
- Ranking: ${formatValue(item.ranking)}
- AI citation: ${formatValue(item.ai_citation)}
- Conversion: ${formatValue(item.conversion)}
- Next review: ${item.next_review || "not set"}
- Connector signals: ${item.connector_signals}
- Monitoring status: ${item.monitoring_status}
`;
}

function renderSuggestionList(items, key) {
  const suggestions = items.flatMap((item) => item[key].map((suggestion) => `${item.id}: ${suggestion}`));
  if (!suggestions.length) return "- No suggestions.\n";
  return suggestions.map((suggestion) => `- ${suggestion}`).join("\n") + "\n";
}

function findGeoFiles() {
  return geoDirs.flatMap((dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((file) => file.endsWith(".md") && file !== "README.md")
      .map((file) => path.join(dir, file));
  });
}

function connectorSignals(url, connectors) {
  const searchRecords = connectors.searchPerformance.filter((record) => record.url === url);
  const trafficRecords = connectors.trafficPerformance.filter((record) => record.url === url);
  const geoRecords = connectors.geoResults.filter((record) => record.url === url);
  const conversionRecords = connectors.conversions.filter((record) => record.url === url);
  const securityRecords = connectors.trafficSecurity.filter((record) => record.url === url);
  const impressions = sum(searchRecords, "impressions");
  const clicks = sum(searchRecords, "clicks");
  const pageviews = sum(trafficRecords, "pageview");
  const requests = sum(securityRecords, "requests");
  const botRequests = sum(securityRecords.filter((record) => record.bot), "requests");
  const conversions = sum(conversionRecords, "value");
  const mentions = geoRecords.filter((record) => record.mentioned).length;
  const citations = geoRecords.filter((record) => record.citation_url).length;
  const topQuery = [...searchRecords].sort((a, b) => (b.impressions || 0) - (a.impressions || 0))[0]?.query || null;

  return {
    totalRecords: searchRecords.length + trafficRecords.length + geoRecords.length + conversionRecords.length + securityRecords.length,
    search: { records: searchRecords.length, impressions, clicks, topQuery },
    traffic: { records: trafficRecords.length, pageviews },
    geo: { records: geoRecords.length, mentions, citations },
    security: { records: securityRecords.length, requests, botRequests },
    conversions: { records: conversionRecords.length, events: conversionRecords.length, value: conversions },
    summary: `search ${clicks}/${impressions} clicks/impressions; pageviews ${pageviews}; GEO mentions ${mentions}/${geoRecords.length}; Cloudflare requests ${requests} (${botRequests} bot); conversions ${conversionRecords.length}`
  };
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function unique(values) {
  return [...new Set(values)];
}

function formatValue(value) {
  return value == null ? "not recorded" : String(value);
}

function sum(records, field) {
  return records.reduce((total, record) => total + (Number(record[field]) || 0), 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generatePerformanceReport();
  console.log(`Performance report: ${result.output}`);
  console.log(`Published content records: ${result.publishedContent}`);
  console.log(`Monitoring records: ${result.monitoringRecords}`);
  console.log(`Connector records: ${JSON.stringify(result.connectorSummary)}`);
  console.log(`Improvement suggestions: ${result.improvementSuggestions}`);
  console.log(`New opportunity suggestions: ${result.newOpportunitySuggestions}`);
}
