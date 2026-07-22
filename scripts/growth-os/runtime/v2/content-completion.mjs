import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  legacyId,
  legacyTimestamp,
  legacyUrl,
  loadLegacySources,
} from './legacy-data-sources.mjs';
import { insertContentVersionInTransaction } from './content-store.mjs';
import { assessDraftAssociation, assessOriginalContent } from './content-integrity.mjs';
import { DEFAULT_DB_PATH, IMPLEMENTATION_ROOT, openV2Store, readUnifiedView } from './store.mjs';
import { withTransaction } from './store.mjs';

export const CONTENT_COMPLETION_ACTOR = 'system-content-completion';
export const CONTENT_COMPLETION_ID = 'growth-os-content-completion-20260721';

const COMPLETABLE_STATUSES = new Set([
  'pending_review',
  'approved',
  'ready_to_publish',
  'published',
]);

const REPLY_KEYS = ['suggested_reply', 'suggested_comment'];
const ORIGINAL_KEYS = ['original_content', 'original_body', 'post_body', 'question', 'body'];
const PUBLISHED_KEYS = [
  'published_content',
  'published_text',
  'published_body',
  'post_text',
  'content_text',
];

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function sourceRecordKey(source, index) {
  return `${source.relativePath}:${index + 1}`;
}

function recordSnapshot(record) {
  return record?.snapshot ?? record;
}

function getFirstText(record, keys) {
  const snapshot = recordSnapshot(record);
  for (const key of keys) {
    const value = text(snapshot?.[key]) ?? text(record?.[key]);
    if (value) return value;
  }
  return null;
}

function addIndex(index, key, value) {
  if (!key) return;
  const values = index.get(key) ?? [];
  values.push(value);
  index.set(key, values);
}

function buildSourceIndex(sourceSnapshot) {
  const byId = new Map();
  const byUrl = new Map();
  for (const source of loadLegacySources({ sourceSnapshot })) {
    if (!source.includeInMigration) continue;
    for (const [index, record] of source.records.entries()) {
      const entry = { source, record, source_record: sourceRecordKey(source, index) };
      addIndex(byId, legacyId(recordSnapshot(record)) ?? legacyId(record), entry);
      addIndex(byUrl, legacyUrl(recordSnapshot(record)) ?? legacyUrl(record), entry);
    }
  }
  return { byId, byUrl };
}

function matchingLegacyRecords(row, index) {
  let evidence = {};
  try {
    evidence = row.evidence_json ? JSON.parse(row.evidence_json) : {};
  } catch {
    evidence = {};
  }
  const matches = [
    ...(index.byId.get(text(evidence.legacy_id)) ?? []),
    ...(index.byUrl.get(text(row.source_url)) ?? []),
  ];
  const unique = new Map();
  for (const match of matches) unique.set(`${match.source.key}:${match.source_record}`, match);
  return [...unique.values()];
}

function uniqueCandidates(matches, contentType) {
  const candidates = [];
  for (const match of matches) {
    const snapshot = recordSnapshot(match.record);
    if (contentType === 'original_content') {
      const value = getFirstText(match.record, ORIGINAL_KEYS);
      if (value && assessOriginalContent(value).valid) {
        candidates.push({ contentText: value, ...match });
      }
    }
    if (contentType === 'reply_draft') {
      const value = getFirstText(match.record, REPLY_KEYS);
      if (value) candidates.push({ contentText: value, ...match });
    }
    if (contentType === 'publish_draft') {
      const isOriginalPost = snapshot?.type === 'original_post';
      const value = isOriginalPost ? getFirstText(match.record, ['draft']) : null;
      if (value) candidates.push({ contentText: value, ...match });
    }
    if (contentType === 'published_content' && match.source.category === 'publication') {
      const value = getFirstText(match.record, PUBLISHED_KEYS);
      if (value) candidates.push({
        contentText: value,
        platform: text(snapshot?.platform),
        ...match,
      });
    }
  }
  const byText = new Map();
  for (const candidate of candidates) {
    const key = candidate.contentText;
    const values = byText.get(key) ?? [];
    values.push(candidate);
    byText.set(key, values);
  }
  return [...byText.values()];
}

function selectExplicitCandidate(matches, contentType, context = {}) {
  const groups = uniqueCandidates(matches, contentType);
  if (groups.length !== 1) {
    return {
      candidate: null,
      reason: groups.length > 1 ? 'ambiguous_legacy_content' : 'no_explicit_legacy_content',
      candidates: groups.flat().map((candidate) => ({
        source: candidate.source.relativePath,
        source_record: candidate.source_record,
        content_preview: candidate.contentText.slice(0, 160),
      })),
    };
  }
  const candidate = groups[0][0];
  if (contentType === 'reply_draft') {
    const association = assessDraftAssociation({
      title: context.title,
      originalContent: context.originalContent,
      draftContent: candidate.contentText,
    });
    if (!association.valid) {
      return {
        candidate: null,
        reason: association.reason,
        candidates: [{
          source: candidate.source.relativePath,
          source_record: candidate.source_record,
          content_preview: candidate.contentText.slice(0, 160),
        }],
      };
    }
  }
  return { candidate, reason: null, candidates: [] };
}

function sourcePlatform(row) {
  const content = row.content?.original_content;
  return text(content?.platform) ?? text(content?.metadata?.platform);
}

function contextCompleteness(original) {
  if (!original) return 'missing';
  if (original.length < 120 || /submitted by|^a sample$|^5\. timeline/i.test(original)) {
    return 'limited';
  }
  return 'captured';
}

export function generateReplyDraft({ title, originalContent }) {
  const subject = text(title) ?? 'this sourcing question';
  const context = text(originalContent) ?? '';
  const haystack = `${subject} ${context}`.toLowerCase();

  if (haystack.includes('certificate of origin') || haystack.includes('exporter name')) {
    return `For ${subject}, I would confirm the exporter of record, who is legally allowed to issue the certificate, and what the destination customs authority and broker will accept before changing any name. Keep the document chain accurate and get the arrangement in writing; an informal substitution could make the certificate unreliable.`;
  }
  if (haystack.includes('tax') || haystack.includes('vat') || haystack.includes('customs')) {
    return `Before placing the order, I would confirm the VAT, import-duty, and customs treatment for the exact delivery term and buyer registration with a qualified customs or tax adviser. Ask the seller or platform to state in writing who collects import VAT, who is the importer of record, and which charges can still appear at arrival. Do not rely on a checkout label alone.`;
  }
  if (haystack.includes('freight') || haystack.includes('shipping') || haystack.includes('ddp') || haystack.includes('lcl') || haystack.includes('fcl')) {
    return `I would compare shipping options using the same shipment scope before choosing. Ask for an itemized quote covering pickup, origin handling, export clearance, freight, destination charges, delivery, and any duties or taxes, and confirm the chargeable weight or volume and the delivery term. Put the assumptions in writing before booking.`;
  }
  if (haystack.includes('sample') || haystack.includes('quotation') || haystack.includes('price')) {
    return `Before moving from a sample or quote to production, I would confirm the product specification, sample acceptance criteria, MOQ, unit price, tooling or customization charges, packaging, lead time, and what happens if the sample does not match. Ask the supplier to tie the quotation, sample, and payment milestones to the same written order version.`;
  }
  if (haystack.includes('manufacturer') || haystack.includes('factory') || haystack.includes('supplier')) {
    return `I would separate what the supplier has confirmed from what is still an assumption. Ask for the exact product specification, manufacturing or trading-company role, MOQ, sample terms, lead time, packaging, payment recipient, and any change conditions in one written summary. That creates a clearer next question without claiming that the supplier has been verified.`;
  }
  return `For ${subject}, I would first separate what is confirmed from what is still unclear. Ask for the exact product or service scope, quantity, price, timing, delivery terms, and payment conditions in writing, then agree on the next acceptance check before committing. This keeps the reply specific without claiming that the counterparty has been verified.`;
}

function action({ row, contentType, contentText, classification, source, metadata, expectedStatus, platform }) {
  return {
    action_id: randomUUID(),
    opportunity_id: row.opportunity_id,
    expected_status: expectedStatus,
    content_type: contentType,
    content_text: contentText,
    classification,
    source: source ?? 'content-completion',
    platform: platform ?? sourcePlatform(row),
    metadata: {
      content_completion_id: CONTENT_COMPLETION_ID,
      content_completion_actor: CONTENT_COMPLETION_ACTOR,
      ...metadata,
    },
  };
}

function contentCounts(db) {
  return Object.fromEntries(db.prepare(`
    SELECT content_type, COUNT(*) AS count
    FROM content_items
    GROUP BY content_type
    ORDER BY content_type
  `).all().map((row) => [row.content_type, row.count]));
}

function statusCounts(db) {
  return Object.fromEntries(db.prepare(`
    SELECT current_status, COUNT(*) AS count
    FROM unified_view
    GROUP BY current_status
    ORDER BY current_status
  `).all().map((row) => [row.current_status, row.count]));
}

function snapshot(db) {
  return {
    opportunities: db.prepare('SELECT COUNT(*) AS count FROM opportunities').get().count,
    lifecycle_events: db.prepare('SELECT COUNT(*) AS count FROM lifecycle_events').get().count,
    content_items: db.prepare('SELECT COUNT(*) AS count FROM content_items').get().count,
    content_by_type: contentCounts(db),
    statuses: statusCounts(db),
  };
}

export function buildContentCompletionPlan({ db, sourceSnapshot = IMPLEMENTATION_ROOT } = {}) {
  if (!db) throw new Error('db is required');
  const sourceIndex = buildSourceIndex(sourceSnapshot);
  const rows = db.prepare(`
    SELECT opportunity_id, title, source_url, current_status, evidence_json
    FROM unified_view
    WHERE current_status IN ('pending_review', 'approved', 'ready_to_publish', 'published')
    ORDER BY opportunity_id
  `).all();
  const fullRows = readUnifiedView(db);
  const byId = new Map(fullRows.map((row) => [row.opportunity_id, row]));
  const actions = [];
  const skipped = [];

  for (const baseRow of rows) {
    const row = byId.get(baseRow.opportunity_id);
    const matches = matchingLegacyRecords(baseRow, sourceIndex);
    const itemActions = [];
    let original = row.content?.original_content;
    let reply = row.content?.latest_reply_draft;
    let publishDraft = row.content?.latest_publish_draft;
    let blockedReason = null;

    if (original && !assessOriginalContent(original.content_text).valid) {
      blockedReason = 'invalid_original_content';
      original = null;
    }

    if (!original) {
      const selected = selectExplicitCandidate(matches, 'original_content');
      if (selected.candidate) {
        const planned = action({
          row,
          contentType: 'original_content',
          contentText: selected.candidate.contentText,
          classification: 'explicit_legacy',
          source: selected.candidate.source.relativePath,
          expectedStatus: baseRow.current_status,
          metadata: {
            migration_source: selected.candidate.source.relativePath,
            migration_record: selected.candidate.source_record,
            migration_content_type: 'snippet',
            source_occurred_at: legacyTimestamp(recordSnapshot(selected.candidate.record)),
          },
        });
        itemActions.push(planned);
        original = { content_text: planned.content_text, platform: planned.platform, metadata: planned.metadata };
      } else if (selected.reason !== 'no_explicit_legacy_content') {
        blockedReason = selected.reason;
      } else {
        blockedReason = 'missing_original_content';
      }
    }

    if (reply && original) {
      const association = assessDraftAssociation({
        title: baseRow.title,
        originalContent: original.content_text,
        draftContent: reply.content_text,
      });
      if (!association.valid) {
        blockedReason = association.reason;
        reply = null;
      }
    }

    if (!reply && baseRow.current_status !== 'published' && original && !blockedReason) {
      const selected = selectExplicitCandidate(matches, 'reply_draft', {
        title: baseRow.title,
        originalContent: original.content_text,
      });
      if (selected.candidate) {
        const planned = action({
          row,
          contentType: 'reply_draft',
          contentText: selected.candidate.contentText,
          classification: 'explicit_legacy',
          source: selected.candidate.source.relativePath,
          expectedStatus: baseRow.current_status,
          platform: original.platform ?? original.metadata?.platform,
          metadata: {
            migration_source: selected.candidate.source.relativePath,
            migration_record: selected.candidate.source_record,
            migration_content_type: selected.candidate.source.key,
            source_occurred_at: legacyTimestamp(recordSnapshot(selected.candidate.record)),
          },
        });
        itemActions.push(planned);
        reply = { ...planned, content_text: planned.content_text };
      } else if (selected.reason === 'no_explicit_legacy_content') {
        const planned = action({
          row,
          contentType: 'reply_draft',
          contentText: generateReplyDraft({ title: baseRow.title, originalContent: original.content_text }),
          classification: 'generated_review_required',
          source: 'content-completion',
          expectedStatus: baseRow.current_status,
          platform: original.platform ?? original.metadata?.platform,
          metadata: {
            generation_method: 'operator_assist_from_captured_content',
            generation_reason: 'No unambiguous legacy reply draft was found.',
            context_completeness: contextCompleteness(original.content_text),
            source_content_id: original.content_id ?? null,
            external_action: 'not_posted',
          },
        });
        itemActions.push(planned);
        reply = { ...planned, content_text: planned.content_text };
      } else {
        blockedReason = selected.reason;
      }
    }

    if (!publishDraft && baseRow.current_status !== 'published' && reply && !blockedReason) {
      const planned = action({
        row,
        contentType: 'publish_draft',
        contentText: reply.content_text,
        classification: 'derived_from_reply_draft',
        source: 'content-completion',
        expectedStatus: baseRow.current_status,
        platform: reply.platform ?? original?.platform ?? original?.metadata?.platform,
        metadata: {
          derivation: 'latest_reply_draft',
          source_content_id: reply.content_id ?? null,
          requires_operator_review: true,
          external_action: 'not_posted',
        },
      });
      itemActions.push(planned);
      publishDraft = planned;
    }

    if (!row.content?.published_content && baseRow.current_status === 'published') {
      const selected = selectExplicitCandidate(matches, 'published_content');
      if (selected.candidate && (selected.candidate.platform || row.platform)) {
        itemActions.push(action({
          row,
          contentType: 'published_content',
          contentText: selected.candidate.contentText,
          classification: 'explicit_legacy_published_content',
          source: selected.candidate.source.relativePath,
          expectedStatus: baseRow.current_status,
          platform: selected.candidate.platform ?? row.platform,
          metadata: {
            migration_source: selected.candidate.source.relativePath,
            migration_record: selected.candidate.source_record,
            published_at: row.published_at,
            published_url: row.published_url,
            historical_content_recovery: true,
          },
        }));
      }
    }

    if (itemActions.length) actions.push(...itemActions);
    if (blockedReason || !row.content?.original_content || (baseRow.current_status !== 'published' && !row.content?.latest_reply_draft)) {
      skipped.push({
        opportunity_id: baseRow.opportunity_id,
        current_status: baseRow.current_status,
        reason: blockedReason ?? (!row.content?.original_content ? 'missing_original_content' : 'no_completable_content'),
        title: baseRow.title,
      });
    }
  }

  return {
    completion_id: CONTENT_COMPLETION_ID,
    generated_at: new Date().toISOString(),
    source_snapshot: sourceSnapshot,
    actor: CONTENT_COMPLETION_ACTOR,
    actions,
    skipped,
    counts: {
      actions: actions.length,
      by_content_type: Object.fromEntries(
        ['original_content', 'reply_draft', 'publish_draft', 'published_content']
          .map((type) => [type, actions.filter((item) => item.content_type === type).length]),
      ),
      by_classification: Object.fromEntries(
        [...new Set(actions.map((item) => item.classification))]
          .map((classification) => [classification, actions.filter((item) => item.classification === classification).length]),
      ),
      skipped: skipped.length,
    },
  };
}

function loadPlan(planPath) {
  const report = JSON.parse(readFileSync(planPath, 'utf8'));
  const plan = report.plan ?? report;
  if (plan.completion_id !== CONTENT_COMPLETION_ID) throw new Error('completion plan id is invalid');
  if (!Array.isArray(plan.actions)) throw new Error('completion plan actions are required');
  return plan;
}

function applyActions(db, actions, now) {
  const results = [];
  withTransaction(db, () => {
    for (const item of actions) {
      const current = db.prepare(`
        SELECT u.current_status,
          (SELECT 1 FROM content_items c WHERE c.opportunity_id = u.opportunity_id AND c.content_type = ? LIMIT 1) AS content_exists
        FROM unified_view u
        WHERE u.opportunity_id = ?
      `).get(item.content_type, item.opportunity_id);
      if (!current) {
        results.push({ ...item, result: 'skipped_missing_opportunity' });
        continue;
      }
      if (current.current_status !== item.expected_status) {
        results.push({ ...item, result: `skipped_state_${current.current_status}` });
        continue;
      }
      if (current.content_exists) {
        results.push({ ...item, result: 'skipped_content_exists' });
        continue;
      }
      const saved = insertContentVersionInTransaction(db, {
        opportunityId: item.opportunity_id,
        contentType: item.content_type,
        contentText: item.content_text,
        platform: item.platform,
        source: item.source,
        createdBy: CONTENT_COMPLETION_ACTOR,
        occurredAt: now,
        metadata: {
          ...item.metadata,
          completed_at: now,
        },
      });
      results.push({ ...item, result: 'saved', content_id: saved.content_id, version: saved.version });
    }
  });
  return results;
}

export function runContentCompletion({
  targetDb,
  sourceSnapshot = IMPLEMENTATION_ROOT,
  reportPath,
  planPath,
  execute = false,
  confirmProduction = false,
  now = new Date(),
} = {}) {
  if (!targetDb) throw new Error('targetDb is required');
  if (resolve(targetDb) === resolve(DEFAULT_DB_PATH) && execute && !confirmProduction) {
    throw new Error('production execution requires --confirm-production');
  }
  const store = openV2Store({ dbPath: targetDb, rebuildView: false });
  try {
    const before = snapshot(store.db);
    const plan = planPath ? loadPlan(planPath) : buildContentCompletionPlan({ db: store.db, sourceSnapshot });
    const result = execute
      ? applyActions(store.db, plan.actions, new Date(now).toISOString())
      : plan.actions.map((item) => ({ ...item, result: 'planned' }));
    const after = snapshot(store.db);
    const report = {
      completion_id: plan.completion_id,
      mode: execute ? 'execute' : 'dry_run',
      generated_at: new Date(now).toISOString(),
      target_db: targetDb,
      source_snapshot: plan.source_snapshot ?? sourceSnapshot,
      before,
      plan: {
        ...plan,
        actions: plan.actions.map(({ content_text: contentText, ...item }) => ({
          ...item,
          content_text: contentText,
        })),
      },
      results: result.map(({ content_text: contentText, ...item }) => ({
        ...item,
        content_text: contentText,
      })),
      after,
      verification: {
        opportunities_unchanged: before.opportunities === after.opportunities,
        lifecycle_events_unchanged: before.lifecycle_events === after.lifecycle_events,
        statuses_unchanged: JSON.stringify(before.statuses) === JSON.stringify(after.statuses),
        content_items_append_only: after.content_items >= before.content_items,
      },
    };
    if (reportPath) {
      mkdirSync(dirname(reportPath), { recursive: true });
      writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }
    return report;
  } finally {
    store.close();
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    const key = argv[index].slice(2).replaceAll('-', '_');
    args[key] = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[++index] : true;
  }
  return args;
}

if (process.argv[1]?.endsWith('/content-completion.mjs')) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const targetDb = args.target_db || process.env.GROWTH_OS_CONTENT_TARGET_DB;
    const report = runContentCompletion({
      targetDb,
      sourceSnapshot: args.source_snapshot || IMPLEMENTATION_ROOT,
      reportPath: args.report,
      planPath: args.plan,
      execute: args.execute === true,
      confirmProduction: args.confirm_production === true,
    });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.verification.opportunities_unchanged
      && report.verification.lifecycle_events_unchanged ? 0 : 1;
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
