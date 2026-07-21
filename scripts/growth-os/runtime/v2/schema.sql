PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS opportunities (
  opportunity_id TEXT PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  source_url TEXT,
  title TEXT NOT NULL,
  body TEXT,
  evidence_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS opportunities_source_url_unique
  ON opportunities (source_url)
  WHERE source_url IS NOT NULL;

CREATE TABLE IF NOT EXISTS lifecycle_events (
  event_seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  opportunity_id TEXT NOT NULL
    REFERENCES opportunities (opportunity_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  from_status TEXT,
  to_status TEXT NOT NULL
    CHECK (to_status IN (
      'pending_review',
      'approved',
      'ready_to_publish',
      'published',
      'archived'
    )),
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'create_opportunity',
      'approve',
      'mark_ready_to_publish',
        'mark_published',
        'archive',
        'archive_irrelevant_discovery',
        'admin_restore_pending_review',
        'admin_reconcile_missing_publish_draft'
      )),
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  evidence_ref TEXT,
  published_at TEXT,
  platform TEXT,
  published_url TEXT,
  CHECK (
    to_status <> 'published'
    OR (
      published_at IS NOT NULL
      AND length(trim(published_at)) > 0
      AND platform IS NOT NULL
      AND length(trim(platform)) > 0
      AND published_url IS NOT NULL
      AND length(trim(published_url)) > 0
    )
  ),
  CHECK (
    to_status = 'published'
    OR (
      published_at IS NULL
      AND platform IS NULL
      AND published_url IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS lifecycle_events_opportunity_order
  ON lifecycle_events (opportunity_id, event_seq DESC);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_events_one_published_per_opportunity
  ON lifecycle_events (opportunity_id)
  WHERE to_status = 'published';

CREATE TABLE IF NOT EXISTS performance (
  opportunity_id TEXT PRIMARY KEY
    REFERENCES opportunities (opportunity_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  performance_status TEXT NOT NULL
    CHECK (performance_status IN ('pending', 'confirmed', 'action_required')),
  metrics_json TEXT,
  confirmed_at TEXT,
  action_required_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS brief_deliveries (
  brief_date TEXT NOT NULL,
  opportunity_id TEXT NOT NULL
    REFERENCES opportunities (opportunity_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  eligible_stage TEXT NOT NULL
    CHECK (eligible_stage IN ('pending_review', 'ready_to_publish', 'action_required')),
  last_brief_generated_at TEXT NOT NULL,
  PRIMARY KEY (brief_date, opportunity_id, eligible_stage)
);

CREATE TABLE IF NOT EXISTS content_items (
  content_id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL
    REFERENCES opportunities (opportunity_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  content_type TEXT NOT NULL
    CHECK (content_type IN (
      'original_content',
      'reply_draft',
      'publish_draft',
      'published_content'
    )),
  content_text TEXT NOT NULL
    CHECK (length(trim(content_text)) > 0),
  platform TEXT,
  source TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('captured', 'draft', 'published')),
  version INTEGER NOT NULL
    CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  metadata_json TEXT,
  UNIQUE (opportunity_id, content_type, version),
  CHECK (
    (content_type = 'original_content' AND status = 'captured')
    OR (content_type IN ('reply_draft', 'publish_draft') AND status = 'draft')
    OR (content_type = 'published_content' AND status = 'published')
  ),
  CHECK (
    content_type <> 'published_content'
    OR (
      platform IS NOT NULL
      AND length(trim(platform)) > 0
    )
  )
);

CREATE INDEX IF NOT EXISTS content_items_latest_lookup
  ON content_items (opportunity_id, content_type, version DESC);

CREATE UNIQUE INDEX IF NOT EXISTS content_items_one_published_content
  ON content_items (opportunity_id)
  WHERE content_type = 'published_content';

CREATE TRIGGER IF NOT EXISTS lifecycle_events_append_only_update
BEFORE UPDATE ON lifecycle_events
BEGIN
  SELECT RAISE(ABORT, 'lifecycle_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS lifecycle_events_append_only_delete
BEFORE DELETE ON lifecycle_events
BEGIN
  SELECT RAISE(ABORT, 'lifecycle_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS content_items_append_only_update
BEFORE UPDATE ON content_items
BEGIN
  SELECT RAISE(ABORT, 'content_items is append-only');
END;

CREATE TRIGGER IF NOT EXISTS content_items_append_only_delete
BEFORE DELETE ON content_items
BEGIN
  SELECT RAISE(ABORT, 'content_items is append-only');
END;
