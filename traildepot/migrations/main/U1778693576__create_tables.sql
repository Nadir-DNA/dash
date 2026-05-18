-- Create all Dash tables for TrailBase

-- ── Companies ──
CREATE TABLE IF NOT EXISTS companies (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- ── Contacts ──
CREATE TABLE IF NOT EXISTS contacts (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  company_id BLOB REFERENCES companies(id),
  source TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'new',
  value REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- ── Campaigns ──
CREATE TABLE IF NOT EXISTS campaigns (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  channel TEXT NOT NULL DEFAULT 'email',
  sent_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- ── SMS Batches ──
CREATE TABLE IF NOT EXISTS sms_batches (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  campaign_id BLOB NOT NULL REFERENCES campaigns(id),
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  total_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  city_filter TEXT,
  profession_filter TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- ── SMS Batch Contacts ──
CREATE TABLE IF NOT EXISTS sms_batch_contacts (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  batch_id BLOB NOT NULL REFERENCES sms_batches(id),
  lead_id BLOB,
  first_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  profession TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TEXT,
  replied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(stage);
CREATE INDEX IF NOT EXISTS idx_sms_batches_campaign_id ON sms_batches(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_batch_contacts_batch_id ON sms_batch_contacts(batch_id);
CREATE INDEX IF NOT EXISTS idx_sms_batch_contacts_status ON sms_batch_contacts(status);
