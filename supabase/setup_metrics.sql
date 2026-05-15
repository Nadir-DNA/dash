-- Dashboard Metrics Tables
-- Run in Supabase SQL Editor

-- Main metrics table
CREATE TABLE IF NOT EXISTS dash_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Acquisition
  visits INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  
  -- Conversion
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  signups INTEGER DEFAULT 0,
  subscribers INTEGER DEFAULT 0,
  
  -- Engagement
  avg_session_duration INTEGER DEFAULT 0,
  pages_per_session DECIMAL(3,2) DEFAULT 0,
  bounce_rate INTEGER DEFAULT 0,
  
  -- Revenue
  mrr INTEGER DEFAULT 0,
  arpu INTEGER DEFAULT 0,
  ltv INTEGER DEFAULT 0,
  churn_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Active users
  dau INTEGER DEFAULT 0,
  mau INTEGER DEFAULT 0,
  
  -- Marketplace
  listings INTEGER DEFAULT 0,
  transactions INTEGER DEFAULT 0,
  sellers INTEGER DEFAULT 0,
  buyers INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, date)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dash_metrics_project_date ON dash_metrics(project_id, date DESC);

-- RLS
ALTER TABLE dash_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON dash_metrics FOR SELECT USING (true);
CREATE POLICY "Authenticated write" ON dash_metrics FOR ALL USING (auth.role() = 'authenticated');

-- Projects config table
CREATE TABLE IF NOT EXISTS dash_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📊',
  supabase_url TEXT,
  supabase_project_ref TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default projects
INSERT INTO dash_projects (id, name, icon) VALUES
  ('amens', 'Amens', '🏠'),
  ('flashcert', 'FlashCert', '🎓'),
  ('agentcrm', 'AgentCRM', '👥'),
  ('teamgame', 'TeamGame', '🎮'),
  ('digital-dna', 'Digital-DNA', '🧬'),
  ('fieat', 'Fieat', '💰')
ON CONFLICT (id) DO NOTHING;

-- Function to upsert daily metrics
CREATE OR REPLACE FUNCTION upsert_metric(
  p_project_id TEXT,
  p_metric_name TEXT,
  p_value INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO dash_metrics (project_id, date)
  VALUES (p_project_id, CURRENT_DATE)
  ON CONFLICT (project_id, date) DO UPDATE SET
    updated_at = NOW();
  
  -- Update specific metric
  EXECUTE format('UPDATE dash_metrics SET %I = %s WHERE project_id = %L AND date = CURRENT_DATE',
    p_metric_name, p_value, p_project_id);
END;
$$ LANGUAGE plpgsql;

-- View for latest metrics per project
CREATE OR REPLACE VIEW dash_latest_metrics AS
SELECT DISTINCT ON (project_id) *
FROM dash_metrics
ORDER BY project_id, date DESC;

-- Grant access
GRANT SELECT ON dash_projects TO anon, authenticated;
GRANT SELECT ON dash_metrics TO anon, authenticated;
GRANT INSERT ON dash_metrics TO authenticated;
