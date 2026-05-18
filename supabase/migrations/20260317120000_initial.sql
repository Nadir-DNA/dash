-- AgentCRM v2 - Schema initial
-- Run in Supabase SQL Editor

-- Companies
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  industry text,
  size text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contacts
create type contact_stage as enum (
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  title text,
  stage contact_stage not null default 'new',
  tags text[] not null default '{}',
  source text,
  value numeric(10,2),
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_company_id_idx on contacts(company_id);
create index contacts_stage_idx on contacts(stage);
create index contacts_email_idx on contacts(email);

-- Interactions
create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  type text not null, -- 'email', 'sms', 'call', 'note', 'meeting'
  subject text,
  body text,
  direction text not null default 'outbound', -- 'inbound' | 'outbound'
  created_at timestamptz not null default now()
);

create index interactions_contact_id_idx on interactions(contact_id);
create index interactions_company_id_idx on interactions(company_id);

-- Campaigns
create type campaign_status as enum ('draft', 'active', 'paused', 'completed');
create type campaign_channel as enum ('email', 'sms', 'sequence');

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null, -- null = global campaign
  name text not null,
  channel campaign_channel not null default 'email',
  status campaign_status not null default 'draft',
  subject text,
  body text,
  scheduled_at timestamptz,
  sent_count integer not null default 0,
  open_count integer not null default 0,
  click_count integer not null default 0,
  reply_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_company_id_idx on campaigns(company_id);
create index campaigns_status_idx on campaigns(status);

-- Campaign Contacts (enrollment)
create type enrollment_status as enum ('active', 'completed', 'unsubscribed', 'bounced');

create table if not exists campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  status enrollment_status not null default 'active',
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  enrolled_at timestamptz not null default now(),
  unique(campaign_id, contact_id)
);

create index campaign_contacts_campaign_id_idx on campaign_contacts(campaign_id);
create index campaign_contacts_contact_id_idx on campaign_contacts(contact_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at before update on companies
  for each row execute function update_updated_at();
create trigger contacts_updated_at before update on contacts
  for each row execute function update_updated_at();
create trigger campaigns_updated_at before update on campaigns
  for each row execute function update_updated_at();

-- RLS
alter table companies enable row level security;
alter table contacts enable row level security;
alter table interactions enable row level security;
alter table campaigns enable row level security;
alter table campaign_contacts enable row level security;

-- Policies (service_role bypasses RLS — pour les API Routes)
-- Pour un accès authentifié, ajoute tes propres policies ici
create policy "Allow all for authenticated" on companies
  for all using (true);
create policy "Allow all for authenticated" on contacts
  for all using (true);
create policy "Allow all for authenticated" on interactions
  for all using (true);
create policy "Allow all for authenticated" on campaigns
  for all using (true);
create policy "Allow all for authenticated" on campaign_contacts
  for all using (true);
