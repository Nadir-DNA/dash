#!/usr/bin/env python3
"""
Setup Supabase tables for Dash metrics
Run this once to create the required tables
"""

import os
import sys

try:
    from supabase import create_client
except ImportError:
    print("Installing supabase...")
    os.system("pip install supabase -q")
    from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://psgsylbsjbgltigqfaoh.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")

def create_tables():
    """Create dash_metrics table using Supabase RPC"""
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # SQL to create tables
    # Note: DDL requires service role key, which we might not have
    # For now, we'll try to use the REST API directly
    
    print("=" * 50)
    print("Dash Metrics Setup")
    print("=" * 50)
    print()
    print("To create tables, run this SQL in Supabase SQL Editor:")
    print()
    print("-" * 50)
    
    sql = '''
-- Dash Metrics Table
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
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, date)
);

CREATE INDEX IF NOT EXISTS idx_dash_metrics_project_date ON dash_metrics(project_id, date DESC);

ALTER TABLE dash_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON dash_metrics FOR SELECT USING (true);
CREATE POLICY "Authenticated write" ON dash_metrics FOR ALL USING (auth.role() = 'authenticated');

-- Projects table
CREATE TABLE IF NOT EXISTS dash_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📊',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dash_projects (id, name, icon) VALUES
  ('amens', 'Amens', '🏠'),
  ('flashcert', 'FlashCert', '🎓'),
  ('agentcrm', 'AgentCRM', '👥')
ON CONFLICT (id) DO NOTHING;
'''
    
    print(sql)
    print("-" * 50)
    print()
    print("Then run in your terminal:")
    print()
    print("  1. Go to: https://supabase.com/dashboard/project/psgsylbsjbgltigqfaoh/sql/new")
    print("  2. Paste the SQL above")
    print("  3. Click 'Run'")
    print()
    
    # Try to insert sample data directly
    try:
        # Check if dash_metrics exists by trying to select from it
        response = client.table("dash_metrics").select("*").limit(1).execute()
        print("✓ dash_metrics table exists!")
    except Exception as e:
        if "Could not find" in str(e):
            print("⚠ dash_metrics table does not exist yet")
            print("  Please run the SQL above in Supabase SQL Editor")
        else:
            print(f"⚠ Error checking table: {e}")


if __name__ == "__main__":
    create_tables()