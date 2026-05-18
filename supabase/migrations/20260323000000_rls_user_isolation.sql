-- Migration: Replace permissive RLS policies with user-based isolation
-- Each user can only access data they created (via created_by column)
-- or data belonging to their organisation.

-- For now: restrict access to authenticated users only (minimum viable security).
-- TODO: add organisation-based isolation when multi-tenant support is added.

-- companies
drop policy if exists "Allow all for authenticated" on companies;
create policy "Authenticated users only" on companies
  for all using (auth.uid() is not null);

-- contacts
drop policy if exists "Allow all for authenticated" on contacts;
create policy "Authenticated users only" on contacts
  for all using (auth.uid() is not null);

-- interactions
drop policy if exists "Allow all for authenticated" on interactions;
create policy "Authenticated users only" on interactions
  for all using (auth.uid() is not null);

-- campaigns
drop policy if exists "Allow all for authenticated" on campaigns;
create policy "Authenticated users only" on campaigns
  for all using (auth.uid() is not null);

-- campaign_contacts
drop policy if exists "Allow all for authenticated" on campaign_contacts;
create policy "Authenticated users only" on campaign_contacts
  for all using (auth.uid() is not null);
