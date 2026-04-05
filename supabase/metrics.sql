-- Dash Metrics Table
-- Run this in Supabase SQL Editor

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
  avg_session_duration INTEGER DEFAULT 0, -- seconds
  pages_per_session DECIMAL(3,2) DEFAULT 0,
  bounce_rate INTEGER DEFAULT 0,
  
  -- Revenue
  mrr INTEGER DEFAULT 0, -- Monthly Recurring Revenue in cents
  arpu INTEGER DEFAULT 0, -- Average Revenue Per User in cents
  ltv INTEGER DEFAULT 0, -- Lifetime Value in cents
  churn_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Active users
  dau INTEGER DEFAULT 0,
  mau INTEGER DEFAULT 0,
  
  -- Marketplace specific
  listings INTEGER DEFAULT 0,
  transactions INTEGER DEFAULT 0,
  sellers INTEGER DEFAULT 0,
  buyers INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, date)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_dash_metrics_project_date ON dash_metrics(project_id, date DESC);

-- Enable Row Level Security
ALTER TABLE dash_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read (for dashboard anon key)
CREATE POLICY "Public read access" ON dash_metrics
  FOR SELECT USING (true);

-- Policy: Allow authenticated write
CREATE POLICY "Authenticated write access" ON dash_metrics
  FOR ALL USING (auth.role() = 'authenticated');

-- Function to upsert daily metrics
CREATE OR REPLACE FUNCTION upsert_daily_metrics(
  p_project_id TEXT,
  p_date DATE DEFAULT CURRENT_DATE,
  p_visits INTEGER DEFAULT 0,
  p_page_views INTEGER DEFAULT 0,
  p_unique_visitors INTEGER DEFAULT 0,
  p_conversion_rate DECIMAL DEFAULT 0,
  p_signups INTEGER DEFAULT 0,
  p_subscribers INTEGER DEFAULT 0,
  p_dau INTEGER DEFAULT 0,
  p_mau INTEGER DEFAULT 0,
  p_mrr INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO dash_metrics (
    project_id, date, visits, page_views, unique_visitors,
    conversion_rate, signups, subscribers, dau, mau, mrr
  ) VALUES (
    p_project_id, p_date, p_visits, p_page_views, p_unique_visitors,
    p_conversion_rate, p_signups, p_subscribers, p_dau, p_mau, p_mrr
  )
  ON CONFLICT (project_id, date) DO UPDATE SET
    visits = EXCLUDED.visits,
    page_views = EXCLUDED.page_views,
    unique_visitors = EXCLUDED.unique_visitors,
    conversion_rate = EXCLUDED.conversion_rate,
    signups = EXCLUDED.signups,
    subscribers = EXCLUDED.subscribers,
    dau = EXCLUDED.dau,
    mau = EXCLUDED.mau,
    mrr = EXCLUDED.mrr,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO dash_metrics (project_id, date, visits, page_views, unique_visitors, conversion_rate, signups, subscribers, dau, mau, mrr)
VALUES 
  ('amens', CURRENT_DATE - 6, 1200, 3400, 980, 3.1, 38, 22, 85, 400, 420000),
  ('amens', CURRENT_DATE - 5, 1180, 3200, 950, 3.2, 36, 24, 82, 395, 435000),
  ('amens', CURRENT_DATE - 4, 1350, 3600, 1100, 3.4, 42, 28, 90, 408, 450000),
  ('amens', CURRENT_DATE - 3, 1280, 3500, 1050, 3.0, 35, 26, 88, 410, 445000),
  ('amens', CURRENT_DATE - 2, 1420, 3800, 1150, 3.5, 45, 32, 95, 418, 460000),
  ('amens', CURRENT_DATE - 1, 1550, 4100, 1250, 3.3, 48, 35, 92, 425, 480000),
  ('amens', CURRENT_DATE, 1600, 4200, 1300, 3.2, 50, 35, 89, 412, 450000)
ON CONFLICT (project_id, date) DO UPDATE SET
  visits = EXCLUDED.visits,
  page_views = EXCLUDED.page_views,
  unique_visitors = EXCLUDED.unique_visitors,
  conversion_rate = EXCLUDED.conversion_rate,
  signups = EXCLUDED.signups,
  subscribers = EXCLUDED.subscribers,
  dau = EXCLUDED.dau,
  mau = EXCLUDED.mau,
  mrr = EXCLUDED.mrr;