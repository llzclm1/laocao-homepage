import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IMPLEMENTATION_ROOT } from './store.mjs';

function selectArray(value, selector) {
  if (!selector) {
    return Array.isArray(value) ? value : [];
  }
  const selected = selector(value);
  return Array.isArray(selected) ? selected : [];
}

export const LEGACY_SOURCE_DEFINITIONS = Object.freeze([
  {
    key: 'opportunities',
    relativePath: 'data/growth-os/opportunities.jsonl',
    category: 'opportunity',
    format: 'jsonl',
    includeInMigration: true,
  },
  {
    key: 'geo_opportunities',
    relativePath: 'data/growth-os/geo/opportunities.jsonl',
    category: 'opportunity',
    format: 'jsonl',
    includeInMigration: true,
  },
  {
    key: 'social_discovery_discovered_posts',
    relativePath: 'data/growth-os/social-discovery/discovered-posts.json',
    category: 'opportunity',
    format: 'json',
    includeInMigration: true,
  },
  {
    key: 'social_discovery_today_opportunities',
    relativePath: 'data/growth-os/social-discovery/today-opportunities.json',
    category: 'opportunity',
    format: 'json',
    select: (value) => value?.items,
    includeInMigration: true,
  },
  {
    key: 'social_discovery_manual_inbox',
    relativePath: 'data/growth-os/social-discovery/manual-inbox.json',
    category: 'opportunity',
    format: 'json',
    includeInMigration: true,
  },
  {
    key: 'social_discovery_candidate_actions',
    relativePath: 'data/growth-os/social-discovery/candidate-actions.jsonl',
    category: 'projection',
    format: 'jsonl',
    includeInMigration: false,
  },
  {
    key: 'social_agent_opportunities',
    relativePath: 'data/social-agent/opportunities.json',
    category: 'opportunity',
    format: 'json',
    includeInMigration: true,
  },
  {
    key: 'social_agent_view_opportunities',
    relativePath: 'data/social-agent/view.json',
    category: 'projection',
    format: 'json',
    select: (value) => value?.opportunities,
    includeInMigration: false,
  },
  {
    key: 'social_agent_view_publications',
    relativePath: 'data/social-agent/view.json',
    category: 'publication',
    format: 'json',
    select: (value) =>
      (value?.opportunities ?? []).filter(
        (record) => record?.status === 'published',
      ),
    includeInMigration: true,
  },
  {
    key: 'social_agent_view_performance',
    relativePath: 'data/social-agent/view.json',
    category: 'performance',
    format: 'json',
    select: (value) =>
      (value?.opportunities ?? []).filter((record) => record?.performance),
    includeInMigration: true,
  },
  {
    key: 'social_agent_lifecycle_actions',
    relativePath: 'data/social-agent/opportunity-lifecycle-actions.jsonl',
    category: 'lifecycle_event',
    format: 'jsonl',
    includeInMigration: true,
  },
  {
    key: 'review_actions',
    relativePath: 'data/growth-os/actions/review-actions.jsonl',
    category: 'lifecycle_event',
    format: 'jsonl',
    includeInMigration: true,
  },
  {
    key: 'review_history',
    relativePath: 'data/growth-os/review-history.jsonl',
    category: 'lifecycle_event',
    format: 'jsonl',
    includeInMigration: true,
  },
  {
    key: 'content_lifecycle',
    relativePath: 'data/growth-os/state/content-lifecycle.json',
    category: 'lifecycle_state',
    format: 'json',
    includeInMigration: true,
  },
  {
    key: 'published_content',
    relativePath: 'data/growth-os/social/published-content.json',
    category: 'publication',
    format: 'json',
    includeInMigration: true,
  },
  {
    key: 'published_links',
    relativePath: 'data/growth-os/social/published-links.json',
    category: 'publication',
    format: 'json',
    includeInMigration: true,
  },
  {
    key: 'social_metrics',
    relativePath: 'data/growth-os/social/social-metrics.json',
    category: 'performance',
    format: 'json',
    includeInMigration: true,
  },
  {
    key: 'social_results',
    relativePath: 'data/growth-os/social/social-result-2026-07-09.json',
    category: 'performance',
    format: 'json',
    includeInMigration: true,
  },
  {
    key: 'published_drafts',
    relativePath: 'data/social-agent/published-drafts.json',
    category: 'projection',
    format: 'json',
    includeInMigration: false,
  },
  {
    key: 'dashboard_view',
    relativePath: 'data/growth-os/viewer/dashboard-view.json',
    category: 'projection',
    format: 'json',
    includeInMigration: false,
  },
  {
    key: 'review_view',
    relativePath: 'data/growth-os/viewer/review-view.json',
    category: 'projection',
    format: 'json',
    includeInMigration: false,
  },
]);

function parseJsonLines(raw, relativePath) {
  const records = [];
  const parseErrors = [];
  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!line.trim()) {
      continue;
    }
    try {
      records.push(JSON.parse(line));
    } catch (error) {
      parseErrors.push({
        line: index + 1,
        message: error.message,
        raw: line,
        relativePath,
      });
    }
  }
  return { records, parseErrors };
}

export function loadLegacySources({
  sourceSnapshot = IMPLEMENTATION_ROOT,
} = {}) {
  return LEGACY_SOURCE_DEFINITIONS.map((definition) => {
    const fullPath = resolve(sourceSnapshot, definition.relativePath);
    if (!existsSync(fullPath)) {
      return {
        ...definition,
        fullPath,
        missing: true,
        records: [],
        parseErrors: [],
      };
    }

    const raw = readFileSync(fullPath, 'utf8');
    if (definition.format === 'jsonl') {
      const parsed = parseJsonLines(raw, definition.relativePath);
      return {
        ...definition,
        fullPath,
        missing: false,
        ...parsed,
      };
    }

    try {
      const value = JSON.parse(raw);
      return {
        ...definition,
        fullPath,
        missing: false,
        records: selectArray(value, definition.select),
        parseErrors: [],
      };
    } catch (error) {
      return {
        ...definition,
        fullPath,
        missing: false,
        records: [],
        parseErrors: [
          {
            line: null,
            message: error.message,
            raw: raw.slice(0, 1000),
            relativePath: definition.relativePath,
          },
        ],
      };
    }
  });
}

function firstText(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function legacyId(record) {
  return firstText(record, [
    'opportunity_id',
    'opportunityId',
    'content_id',
    'contentId',
    'candidate_id',
    'candidateId',
    'id',
  ]);
}

export function legacyUrl(record) {
  return firstText(record, [
    'published_url',
    'publishedUrl',
    'source_url',
    'sourceUrl',
    'url',
    'link',
  ]);
}

export function legacyDedupeKey(record) {
  return firstText(record, ['dedupe_key', 'dedupeKey', 'normalized_key']);
}

export function legacyStatus(record) {
  return firstText(record, [
    'to_status',
    'toStatus',
    'status',
    'review_status',
    'publish_status',
    'workflow_state',
    'from_status',
    'previous',
    'new',
  ]);
}

export function legacyTitle(record) {
  return firstText(record, [
    'title',
    'question',
    'topic',
    'name',
    'subject',
  ]);
}

export function legacyBody(record) {
  return firstText(record, [
    'body',
    'draft',
    'suggested_reply',
    'suggested_comment',
    'summary',
    'snippet',
    'note',
  ]);
}

export function legacyTimestamp(record) {
  return firstText(record, [
    'occurred_at',
    'occurredAt',
    'published_at',
    'publishedAt',
    'updated_at',
    'updatedAt',
    'captured_at',
    'discovered_at',
    'created_at',
    'createdAt',
    'at',
    'date',
    'published_date',
    'publishedDate',
    'updated',
  ]);
}

export function inventoryStatus(record) {
  return legacyStatus(record) ?? 'status_missing';
}
