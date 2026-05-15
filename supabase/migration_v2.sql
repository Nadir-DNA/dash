-- Dash Metrics Table v2 — JSONB approach (flexible)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ntsbywucjgusewcgblhz/sql/new

-- Drop old if exists
DROP TABLE IF EXISTS dash_metrics CASCADE;
DROP TABLE IF EXISTS dash_projects CASCADE;

-- Main metrics table (JSONB for flexibility)
CREATE TABLE dash_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Index
CREATE INDEX idx_dash_metrics_project ON dash_metrics(project_id);
CREATE INDEX idx_dash_metrics_collected ON dash_metrics(collected_at DESC);

-- RLS: allow public read
ALTER TABLE dash_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON dash_metrics FOR SELECT USING (true);

-- Also allow anon key writes for the collector script
CREATE POLICY "Service write" ON dash_metrics FOR ALL USING (true) WITH CHECK (true);

-- Projects config
CREATE TABLE dash_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📊',
  color TEXT DEFAULT '#8b8b9e',
  supabase_url TEXT,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE dash_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read projects" ON dash_projects FOR SELECT USING (true);
CREATE POLICY "Service write projects" ON dash_projects FOR ALL USING (true) WITH CHECK (true);

-- Insert projects
INSERT INTO dash_projects (id, name, icon, color, supabase_url) VALUES
  ('amens', 'Amens', '🧘', '#2dd4a8', 'https://ntsbywucjgusewcgblhz.supabase.co'),
  ('agentcrm', 'AgentCRM', '👥', '#8b5cf6', 'https://psgsylbsjbgltigqfaoh.supabase.co'),
  ('flashcert', 'FlashCert', '🎓', '#f59e0b', NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color;
