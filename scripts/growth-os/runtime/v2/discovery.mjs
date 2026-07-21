import { createHash, randomUUID } from 'node:crypto';
import { createSearchProvider } from '../../discovery/providers/search-provider.mjs';
import { collectRedditRssSource } from '../../discovery/sources/reddit-rss-source.mjs';
import { collectSearchSource } from '../../discovery/sources/search-source.mjs';
import { relevanceEvidence, scoreDiscoveryItem } from './discovery-relevance.mjs';
import { LifecycleEventStore } from './lifecycle-event-store.mjs';
import { DEFAULT_DB_PATH, openV2Store } from './store.mjs';

const DEFAULT_QUERIES = Object.freeze({
  quora: [
    'site:quora.com China Chinese supplier manufacturer factory MOQ sample quotation payment lead time',
  ],
  linkedin: [
    'site:linkedin.com/posts China Chinese supplier manufacturer factory MOQ sample quotation payment lead time',
  ],
  reddit: [
    'site:reddit.com/r/Alibaba supplier manufacturer factory MOQ sample quotation',
    'site:reddit.com/r/smallbusiness China supplier sourcing import quotation sample',
    'site:reddit.com/r/Entrepreneur Chinese supplier manufacturer MOQ payment',
    'site:reddit.com/r/FulfillmentByAmazon China supplier shipping MOQ sample',
    'site:reddit.com/r/ecommerce China supplier quotation sample manufacturing',
  ],
});
const DEFAULT_SUBREDDITS = Object.freeze([
  'Alibaba',
  'smallbusiness',
  'Entrepreneur',
  'FulfillmentByAmazon',
  'ecommerce',
]);

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|ref|trk|tracking|source|fbclid|gclid)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return '';
  }
}

function text(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function opportunityId(dedupeKey) {
  return `opp-${createHash('sha256').update(dedupeKey).digest('hex').slice(0, 20)}`;
}

function readConfig(environment = process.env) {
  try {
    const configured = JSON.parse(environment.GROWTH_OS_V2_DISCOVERY_CONFIG_JSON || '');
    if (configured && typeof configured === 'object') return configured;
  } catch {}
  return {
    queries: DEFAULT_QUERIES,
    subreddits: DEFAULT_SUBREDDITS,
    searchPlatforms: Object.keys(DEFAULT_QUERIES),
  };
}

export function candidateFromItem(item, now = new Date()) {
  const sourceUrl = normalizeUrl(item.canonical_url || item.url);
  const title = text(item.title || item.raw_topic);
  if (!sourceUrl || !title) return null;
  const relevance = scoreDiscoveryItem({ ...item, source_url: sourceUrl });
  const dedupeKey = `url:${sourceUrl}`;
  return {
    opportunityId: opportunityId(dedupeKey),
    dedupeKey,
    sourceUrl,
    title,
    body: text(item.snippet || item.body || item.description),
    evidence: {
      source: 'public_discovery',
      platform: text(item.platform),
      source_method: text(item.source_method),
      source_name: text(item.source_name),
      author: item.author ?? null,
      discovered_at: item.discovered_at || now.toISOString(),
      query: item.query ?? null,
      relevance: relevanceEvidence(relevance),
    },
    relevance,
  };
}

export async function runV2Discovery({
  dbPath = DEFAULT_DB_PATH,
  now = new Date(),
  force = true,
  environment = process.env,
  sourceResults: injectedSourceResults = null,
} = {}) {
  const config = readConfig(environment);
  const provider = createSearchProvider({ ...environment, SOCIAL_DISCOVERY_PUBLIC_SEARCH: environment.SOCIAL_DISCOVERY_PUBLIC_SEARCH || '1' });
  const sourceResults = injectedSourceResults || [];
  const queryConfig = config.queries || DEFAULT_QUERIES;
  const searchPlatforms = config.searchPlatforms || Object.keys(queryConfig);

  if (!injectedSourceResults) {
    for (const platform of searchPlatforms) {
      sourceResults.push(await collectSearchSource({
        platform,
        queries: queryConfig[platform] || [],
        provider,
        now,
        perSourceLimit: 10,
        cooldownHours: 12,
      }));
    }
    for (const subreddit of config.subreddits || []) {
      sourceResults.push(await collectRedditRssSource({
        subreddit,
        now,
        perSourceLimit: 10,
        cooldownHours: 12,
      }));
    }
  }

  const store = openV2Store({ dbPath, rebuildView: false });
  const writer = new LifecycleEventStore({ db: store.db });
  const added = [];
  const duplicates = [];
  const rejected = [];
  try {
    for (const item of sourceResults.flatMap((result) => result.items || [])) {
      const candidate = candidateFromItem(item, now);
      if (!candidate) {
        rejected.push({ source_url: item.url || null, reason: 'missing_public_url_or_title' });
        continue;
      }
      if (candidate.relevance.decision !== 'keep') {
        rejected.push({
          opportunity_id: candidate.opportunityId,
          title: candidate.title,
          source_url: candidate.sourceUrl,
          reason: candidate.relevance.decision,
          category: candidate.relevance.category,
          score: candidate.relevance.score,
          relevance_reasons: candidate.relevance.reasons,
        });
        continue;
      }
      try {
        writer.createOpportunity({
          ...candidate,
          actor: 'v2-discovery',
          occurredAt: now.toISOString(),
        });
        added.push(candidate.opportunityId);
      } catch (error) {
        if (/UNIQUE constraint failed/.test(error.message)) {
          duplicates.push(candidate.opportunityId);
        } else {
          throw error;
        }
      }
    }
  } finally {
    store.close();
  }

  return {
    status: sourceResults.some((result) => ['blocked', 'failed'].includes(result.collection_status)) ? 'completed_with_errors' : 'completed',
    ran_at: now.toISOString(),
    sources: sourceResults.map((result) => ({
      source_name: result.source_name,
      platform: result.platform,
      status: result.collection_status,
      items: result.items?.length || 0,
      errors: result.errors || [],
    })),
    added,
    duplicates,
    rejected,
    force,
  };
}

if (process.argv[1] && process.argv[1].endsWith('/discovery.mjs')) {
  try {
    console.log(JSON.stringify(await runV2Discovery({ dbPath: process.env.GROWTH_OS_V2_DB || DEFAULT_DB_PATH }), null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
