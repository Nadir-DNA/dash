-- Tables pour les projets secondaires du Dash (FlashCert, SiteVitrine, LeaguePlay)

-- ── FlashCert ──
CREATE TABLE IF NOT EXISTS flashcert_users (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  email TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS flashcert_conversions (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  user_id BLOB REFERENCES flashcert_users(id),
  type TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS flashcert_cpf_submissions (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  user_id BLOB REFERENCES flashcert_users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS flashcert_page_views (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  page TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- ── SiteVitrine ──
CREATE TABLE IF NOT EXISTS sitevitrine_sites (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  site_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  stage TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT '',
  labels TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  google_maps_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- ── LeaguePlay ──
CREATE TABLE IF NOT EXISTS leagueplay_players (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  username TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS leagueplay_teams (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS leagueplay_games (
  id BLOB NOT NULL PRIMARY KEY CHECK(is_uuid(id)),
  home_team_id BLOB REFERENCES leagueplay_teams(id),
  away_team_id BLOB REFERENCES leagueplay_teams(id),
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flashcert_users_created_at ON flashcert_users(created_at);
CREATE INDEX IF NOT EXISTS idx_flashcert_cpf_status ON flashcert_cpf_submissions(status);
CREATE INDEX IF NOT EXISTS idx_flashcert_page_views_created_at ON flashcert_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_sitevitrine_sites_status ON sitevitrine_sites(status);
CREATE INDEX IF NOT EXISTS idx_leagueplay_players_created_at ON leagueplay_players(created_at);
CREATE INDEX IF NOT EXISTS idx_leagueplay_games_created_at ON leagueplay_games(created_at);
