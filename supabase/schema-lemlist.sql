-- AgentCRM - Lemlist-like Schema
-- Complete schema for multichannel outreach CRM

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies (already exists)
-- CREATE TABLE IF NOT EXISTS companies (...);

-- Contacts with enrichment data
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Standard fields
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Enrichment data
  title TEXT, -- job title
  company_name TEXT, -- company where they work
  linkedin_url TEXT,
  website TEXT,
  
  -- Personalization variables
  sector TEXT, -- industry
  city TEXT,
  country TEXT,
  company_size TEXT,
  company_revenue TEXT,
  
  -- Status
  stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'interested', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'replied')),
  
  -- Tags for segmentation
  tags TEXT[] DEFAULT '{}',
  
  -- Source tracking
  source TEXT, -- where the lead came from
  campaign_id UUID,
  
  -- Metrics
  email_sent_count INTEGER DEFAULT 0,
  email_opened_count INTEGER DEFAULT 0,
  email_clicked_count INTEGER DEFAULT 0,
  sms_sent_count INTEGER DEFAULT 0,
  
  -- Last contact
  last_contacted_at TIMESTAMPTZ,
  next_follow_up TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns with sequences
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'linkedin', 'whatsapp', 'sequence')),
  
  -- Email specific
  subject TEXT,
  body TEXT,
  template_id UUID,
  
  -- Sequence settings
  is_sequence BOOLEAN DEFAULT FALSE,
  sequence_order INTEGER DEFAULT 1,
  follow_up_delay_days INTEGER DEFAULT 3,
  
  -- Scheduling
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Limits
  daily_limit INTEGER DEFAULT 50,
  total_limit INTEGER,
  
  -- Stats
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign sequences (follow-ups)
CREATE TABLE IF NOT EXISTS campaign_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  step_order INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'linkedin', 'whatsapp')),
  
  subject TEXT,
  body TEXT NOT NULL,
  
  delay_days INTEGER DEFAULT 1,
  delay_hours INTEGER,
  
  condition TEXT CHECK (condition IN ('always', 'if_no_reply', 'if_opened', 'if_clicked', 'if_replied')),
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email/Message tracking
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  campaign_step_id UUID REFERENCES campaign_steps(id) ON DELETE SET NULL,
  
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'linkedin', 'whatsapp')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  
  subject TEXT,
  body TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed', 'unsubscribed')),
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  
  -- External IDs
  external_id TEXT, -- message ID from provider (Resend, Brevo)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'linkedin', 'whatsapp')),
  
  subject TEXT,
  body TEXT NOT NULL,
  
  -- Variables available in this template
  variables TEXT[] DEFAULT '{}',
  
  -- A/B testing
  is_ab_test BOOLEAN DEFAULT FALSE,
  ab_variant TEXT, -- 'a' or 'b'
  ab_subject_a TEXT,
  ab_subject_b TEXT,
  ab_body_a TEXT,
  ab_body_b TEXT,
  
  -- Stats
  usage_count INTEGER DEFAULT 0,
  open_rate NUMERIC,
  click_rate NUMERIC,
  reply_rate NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  
  -- Email stats
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_unsubscribed INTEGER DEFAULT 0,
  
  -- SMS stats
  sms_sent INTEGER DEFAULT 0,
  sms_delivered INTEGER DEFAULT 0,
  sms_failed INTEGER DEFAULT 0,
  
  -- Contact stats
  contacts_added INTEGER DEFAULT 0,
  contacts_converted INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_stage ON contacts(stage);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);

CREATE INDEX idx_campaigns_company ON campaigns(company_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_channel ON campaigns(channel);

CREATE INDEX idx_messages_contact ON messages(contact_id);
CREATE INDEX idx_messages_campaign ON messages(campaign_id);
CREATE INDEX idx_messages_status ON messages(status);

CREATE INDEX idx_analytics_company ON analytics(company_id);
CREATE INDEX idx_analytics_date ON analytics(date);