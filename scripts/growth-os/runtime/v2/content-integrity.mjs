import { ContentStore } from './content-store.mjs';

const INVALID_ORIGINAL_PATTERNS = Object.freeze([
  /^\[(?:removed|deleted)\]$/i,
  /^(?:submitted|posted|shared) by\b/i,
  /^(?:read more|view (?:comments?|post)|click to read)\b/i,
  /^(?:source|footer|disclaimer)\s*:/i,
  /^5\.\s*timeline\b/i,
  /please use this (?:thread|post)|subreddit rules|weekly discussion/i,
]);

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'before', 'could', 'from', 'have', 'into',
  'just', 'more', 'need', 'question', 'should', 'that', 'their', 'there',
  'these', 'this', 'what', 'when', 'where', 'which', 'would', 'your',
]);

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseEvidence(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function meaningfulTokens(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !STOP_WORDS.has(token)),
  );
}

export function assessOriginalContent(value) {
  const content = text(value);
  if (!content) return { valid: false, reason: 'missing_original_content' };
  if (content.length < 40) return { valid: false, reason: 'short_original_content' };
  if (INVALID_ORIGINAL_PATTERNS.some((pattern) => pattern.test(content))) {
    return { valid: false, reason: 'snippet_or_footer_original_content' };
  }
  return { valid: true, reason: null };
}

export function assessDraftAssociation({ title, originalContent, draftContent }) {
  const originalTokens = meaningfulTokens(`${title || ''} ${originalContent || ''}`);
  const draftTokens = meaningfulTokens(draftContent);
  const overlap = [...draftTokens].filter((token) => originalTokens.has(token));
  if (overlap.length > 0) {
    return { valid: true, reason: null, overlap };
  }
  return { valid: false, reason: 'reply_draft_semantic_mismatch', overlap: [] };
}

function platformFor(row, original, reply, publishDraft) {
  const evidence = parseEvidence(row?.evidence_json);
  return text(original?.platform)
    ?? text(reply?.platform)
    ?? text(publishDraft?.platform)
    ?? text(row?.lifecycle_platform)
    ?? text(evidence.platform)
    ?? text(evidence.source_platform);
}

export function getOpportunityContentIntegrity(db, opportunityId, { requirePublishDraft = false } = {}) {
  const row = db.prepare(`
    SELECT o.opportunity_id, o.title, o.source_url, o.evidence_json,
      (
        SELECT platform
        FROM lifecycle_events
        WHERE opportunity_id = o.opportunity_id
        ORDER BY event_seq DESC
        LIMIT 1
      ) AS lifecycle_platform
    FROM opportunities o
    WHERE o.opportunity_id = ?
  `).get(opportunityId);
  if (!row) {
    return {
      opportunity_id: opportunityId,
      valid: false,
      missing: ['opportunity'],
      reasons: ['opportunity_not_found'],
      original_content: null,
      reply_draft: null,
      publish_draft: null,
      platform: null,
      source_url: null,
    };
  }

  const content = new ContentStore({ db });
  const original = content.getLatest(opportunityId, 'original_content');
  const reply = content.getLatest(opportunityId, 'reply_draft');
  const publishDraft = content.getLatest(opportunityId, 'publish_draft');
  const missing = [];
  const reasons = [];
  const originalAssessment = assessOriginalContent(original?.content_text);
  const platform = platformFor(row, original, reply, publishDraft);

  if (!originalAssessment.valid) {
    missing.push('original_content');
    reasons.push(originalAssessment.reason);
  }
  if (!reply?.content_text) {
    missing.push('reply_draft');
    reasons.push('missing_reply_draft');
  } else if (reply.opportunity_id !== opportunityId) {
    missing.push('reply_draft');
    reasons.push('reply_draft_opportunity_mismatch');
  } else if (originalAssessment.valid) {
    const association = assessDraftAssociation({
      title: row.title,
      originalContent: original.content_text,
      draftContent: reply.content_text,
    });
    if (!association.valid) {
      missing.push('reply_draft');
      reasons.push(association.reason);
    }
  }
  if (!platform) {
    missing.push('platform');
    reasons.push('missing_platform');
  }
  if (!text(row.source_url)) {
    missing.push('source_url');
    reasons.push('missing_source_url');
  } else if (!isHttpUrl(row.source_url)) {
    missing.push('source_url');
    reasons.push('invalid_source_url');
  }
  if (requirePublishDraft) {
    if (!publishDraft?.content_text) {
      missing.push('publish_draft');
      reasons.push('missing_publish_draft');
    } else if (publishDraft.opportunity_id !== opportunityId) {
      missing.push('publish_draft');
      reasons.push('publish_draft_opportunity_mismatch');
    }
  }

  return {
    opportunity_id: opportunityId,
    valid: missing.length === 0,
    missing: [...new Set(missing)],
    reasons: [...new Set(reasons)],
    original_content: original,
    reply_draft: reply,
    publish_draft: publishDraft,
    platform,
    source_url: text(row.source_url),
  };
}

export function assertOpportunityContentIntegrity(db, opportunityId, options = {}) {
  const result = getOpportunityContentIntegrity(db, opportunityId, options);
  if (!result.valid) {
    throw new Error(
      `content integrity gate failed for ${opportunityId}: ${result.missing.join(', ')} (${result.reasons.join(', ')})`,
    );
  }
  return result;
}
