import { randomUUID } from 'node:crypto';
import { withTransaction } from './store.mjs';

export const CONTENT_TYPES = Object.freeze([
  'original_content',
  'reply_draft',
  'publish_draft',
  'published_content',
]);

const CONTENT_STATUS = Object.freeze({
  original_content: 'captured',
  reply_draft: 'draft',
  publish_draft: 'draft',
  published_content: 'published',
});

function requiredText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

function optionalText(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
}

function serializeMetadata(value) {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function parseMetadata(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function validateType(contentType) {
  if (!CONTENT_TYPES.includes(contentType)) {
    throw new Error(`invalid content type: ${contentType}`);
  }
}

function normalizeInput(input) {
  const contentType = requiredText(input.contentType, 'contentType');
  validateType(contentType);
  const opportunityId = requiredText(input.opportunityId, 'opportunityId');
  const contentText = requiredText(input.contentText, 'contentText');
  const createdBy = requiredText(input.createdBy, 'createdBy');
  const occurredAt = requiredText(
    input.occurredAt ?? new Date().toISOString(),
    'occurredAt',
  );
  const platform = optionalText(input.platform);
  if (contentType === 'published_content' && !platform) {
    throw new Error('platform is required for published_content');
  }
  return {
    contentId: input.contentId ?? randomUUID(),
    opportunityId,
    contentType,
    contentText,
    platform,
    source: optionalText(input.source),
    status: CONTENT_STATUS[contentType],
    occurredAt,
    createdBy,
    metadataJson: serializeMetadata(input.metadata),
  };
}

function insertVersionInTransaction(db, input) {
  const value = normalizeInput(input);
  const opportunity = db
    .prepare('SELECT opportunity_id FROM opportunities WHERE opportunity_id = ?')
    .get(value.opportunityId);
  if (!opportunity) throw new Error(`opportunity not found: ${value.opportunityId}`);

  const latest = db
    .prepare(`
      SELECT version
      FROM content_items
      WHERE opportunity_id = ? AND content_type = ?
      ORDER BY version DESC
      LIMIT 1
    `)
    .get(value.opportunityId, value.contentType);
  if (value.contentType === 'original_content' && latest) {
    throw new Error('original_content is immutable and already exists');
  }
  if (value.contentType === 'published_content' && latest) {
    throw new Error('published_content is immutable and already exists');
  }

  const version = latest ? Number(latest.version) + 1 : 1;
  db.prepare(`
    INSERT INTO content_items (
      content_id,
      opportunity_id,
      content_type,
      content_text,
      platform,
      source,
      status,
      version,
      created_at,
      updated_at,
      created_by,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    value.contentId,
    value.opportunityId,
    value.contentType,
    value.contentText,
    value.platform,
    value.source,
    value.status,
    version,
    value.occurredAt,
    value.occurredAt,
    value.createdBy,
    value.metadataJson,
  );

  return db.prepare(`
    SELECT content_id, opportunity_id, content_type, content_text,
      platform, source, status, version, created_at, updated_at,
      created_by, metadata_json
    FROM content_items
    WHERE content_id = ?
  `).get(value.contentId);
}

function serializeContent(row) {
  if (!row) return null;
  return {
    content_id: row.content_id,
    opportunity_id: row.opportunity_id,
    content_type: row.content_type,
    content_text: row.content_text,
    platform: row.platform,
    source: row.source,
    status: row.status,
    version: row.version,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    metadata: parseMetadata(row.metadata_json),
  };
}

export function insertContentVersionInTransaction(db, input) {
  return serializeContent(insertVersionInTransaction(db, input));
}

export class ContentStore {
  #db;
  #clock;

  constructor({ db, clock = () => new Date().toISOString() }) {
    if (!db) throw new Error('db is required');
    this.#db = db;
    this.#clock = clock;
  }

  saveVersion(input) {
    return withTransaction(this.#db, () =>
      insertContentVersionInTransaction(this.#db, {
        ...input,
        occurredAt: input.occurredAt ?? this.#clock(),
      }),
    );
  }

  getLatest(opportunityId, contentType) {
    validateType(contentType);
    return serializeContent(this.#db.prepare(`
      SELECT content_id, opportunity_id, content_type, content_text,
        platform, source, status, version, created_at, updated_at,
        created_by, metadata_json
      FROM content_items
      WHERE opportunity_id = ? AND content_type = ?
      ORDER BY version DESC
      LIMIT 1
    `).get(opportunityId, contentType));
  }

  getPacket(opportunityId) {
    const rows = this.#db.prepare(`
      SELECT content_id, opportunity_id, content_type, content_text,
        platform, source, status, version, created_at, updated_at,
        created_by, metadata_json
      FROM content_items
      WHERE opportunity_id = ?
      ORDER BY content_type, version DESC
    `).all(opportunityId);
    const packet = {
      original_content: null,
      latest_reply_draft: null,
      latest_publish_draft: null,
      published_content: null,
    };
    for (const row of rows) {
      const content = serializeContent(row);
      if (content.content_type === 'original_content' && !packet.original_content) packet.original_content = content;
      if (content.content_type === 'reply_draft' && !packet.latest_reply_draft) packet.latest_reply_draft = content;
      if (content.content_type === 'publish_draft' && !packet.latest_publish_draft) packet.latest_publish_draft = content;
      if (content.content_type === 'published_content' && !packet.published_content) packet.published_content = content;
    }
    return packet;
  }

  hasLatest(opportunityId, contentType) {
    return Boolean(this.getLatest(opportunityId, contentType));
  }
}

export function readContentPackets(db, opportunityIds) {
  const ids = [...new Set(opportunityIds.filter(Boolean))];
  const packets = new Map(ids.map((id) => [id, {
    original_content: null,
    latest_reply_draft: null,
    latest_publish_draft: null,
    published_content: null,
  }]));
  if (!ids.length) return packets;
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT content_id, opportunity_id, content_type, content_text,
      platform, source, status, version, created_at, updated_at,
      created_by, metadata_json
    FROM content_items
    WHERE opportunity_id IN (${placeholders})
    ORDER BY opportunity_id, content_type, version DESC
  `).all(...ids);
  for (const row of rows) {
    const packet = packets.get(row.opportunity_id);
    if (!packet) continue;
    const content = serializeContent(row);
    if (content.content_type === 'original_content' && !packet.original_content) packet.original_content = content;
    if (content.content_type === 'reply_draft' && !packet.latest_reply_draft) packet.latest_reply_draft = content;
    if (content.content_type === 'publish_draft' && !packet.latest_publish_draft) packet.latest_publish_draft = content;
    if (content.content_type === 'published_content' && !packet.published_content) packet.published_content = content;
  }
  return packets;
}
