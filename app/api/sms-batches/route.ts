import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';

const TB_URL = process.env.TRAILBASE_URL || 'http://localhost:4000/api/records/v1';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://psgsylbsjbgltigqfaoh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ADB_STATE = `${homedir()}/.hermes/scripts/sms_prospection_state.json`;

// ─── Helper: Trailbase REST client via fetch ───
const TB = (path: string, opts: RequestInit = {}) =>
  fetch(`http://localhost:4000/api/records/v1${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers as Record<string, string> },
    ...opts,
  });

function tb() {
  return {
    records: (table: string) => ({
      list: async (opts?: Record<string, unknown>) => {
        const params = new URLSearchParams();
        if (opts?.order) params.set('order', (opts.order as string[]).join(','));
        if (opts?.filters) {
          const f = opts.filters as { column: string; op: string; value: string }[];
          for (const filter of f) {
            params.set(`${filter.column}`, `eq.${filter.value}`);
          }
        }
        const qs = params.toString();
        const r = await TB(`/${table}${qs ? '?' + qs : ''}`);
        return r.json();
      },
      read: async (id: string) => {
        const r = await TB(`/${table}/${encodeURIComponent(id)}`);
        return { record: await r.json() };
      },
      create: async (data: Record<string, unknown>) => {
        const r = await TB(`/${table}`, { method: 'POST', body: JSON.stringify(data) });
        const json = await r.json();
        return { id: (json.ids || [])[0], ...json };
      },
      update: async (id: string, data: Record<string, unknown>) => {
        const r = await TB(`/${table}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
        return r.json();
      },
    }),
  };
}

// ─── GET: list batches (optionally filtered by campaign_id) ───
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');
    const batchId = searchParams.get('batch_id');

    const client = tb();

    // Single batch detail
    if (batchId) {
      const batch = await client.records('sms_batches').read(batchId);
      // Get contacts for this batch
      const contactsRes = await client.records('sms_batch_contacts').list({
        filters: [{ column: 'batch_id', op: 'equal', value: batchId }],
      });
      return NextResponse.json({
        batch: batch.record,
        contacts: contactsRes.records || [],
      });
    }

    // List batches (optionally by campaign)
    const opts: Record<string, unknown> = { order: ['-created_at'] };
    if (campaignId) {
      opts.filters = [{ column: 'campaign_id', op: 'equal', value: campaignId }];
    }
    const res = await client.records('sms_batches').list(opts);
    return NextResponse.json({ batches: res.records || [] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Batches API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST: import leads from Supabase into a batch ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'import') {
      return await importLeads(body);
    }
    if (action === 'create_batch') {
      return await createBatch(body);
    }
    if (action === 'sync_adb') {
      return await syncFromAdb(body);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Batches API POST]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── Import leads from Supabase into a new batch ───
async function importLeads(body: Record<string, unknown>) {
  const { campaign_id, name, city, profession, limit = 50, offset = 0 } = body;

  if (!campaign_id || !name) {
    return NextResponse.json({ error: 'campaign_id and name required' }, { status: 400 });
  }

  // 1. Fetch leads from Supabase
  let url = `${SUPABASE_URL}/rest/v1/contacts?select=id,first_name,phone,tags&limit=${limit}&offset=${offset}&order=created_at.desc`;
  if (city) url += `&tags=cs.{%22${encodeURIComponent(city as string)}%22}`;
  if (profession) url += `&tags=cs.{%22${encodeURIComponent(profession as string)}%22}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Supabase: ${text.substring(0, 200)}` }, { status: 502 });
  }
  const leads = await res.json();
  if (!Array.isArray(leads)) {
    return NextResponse.json({ error: 'Invalid Supabase response' }, { status: 502 });
  }

  // 2. Enrich: extract ville + metier from tags
  const CITIES = ['Paris','Marseille','Lyon','Toulouse','Nice','Nantes','Strasbourg','Montpellier','Bordeaux','Lille','Rennes','Reims','Toulon','Saint-Étienne','Le Havre','Dijon','Grenoble','Angers','Nîmes','Clermont-Ferrand','Aix-en-Provence','Le Mans','Brest','Tours','Amiens','Limoges','Metz','Nancy','Perpignan','Besançon','Orléans','Rouen','Avignon','Poitiers'];
  const PROFESSIONS = ['coach sportif','kinésithérapeute','ostéopathe','sophrologue','psychologue','naturopathe','nutritionniste','diététicien','professeur yoga','préparateur physique','masseur','réflexologue','hypnothérapeute','médecin douce','praticien'];

  const enriched = leads.map((lead: Record<string, unknown>) => {
    const tags: string[] = (lead.tags as string[]) || [];
    let ville = city as string || '';
    let metier = profession as string || '';
    for (const tag of tags) {
      const t = tag.toLowerCase();
      for (const c of CITIES) {
        if (t.includes(c.toLowerCase())) ville = c;
      }
      for (const p of PROFESSIONS) {
        if (t.includes(p)) metier = p;
      }
    }
    return {
      lead_id: lead.id as string,
      first_name: (lead.first_name as string) || '',
      phone: ((lead.phone as string) || '').replace(/\s/g, ''),
      profession: metier,
      city: ville,
    };
  });

  // 3. Create the batch in Trailbase
  const client = tb();
  const batchRes = await client.records('sms_batches').create({
    campaign_id,
    name,
    status: 'draft',
    total_count: enriched.length,
    city_filter: city || null,
    profession_filter: profession || null,
  });

  const batchId = batchRes.id;

  // 4. Insert contacts
  for (const lead of enriched) {
    if (lead.phone) {
      try {
        await client.records('sms_batch_contacts').create({
          batch_id: batchId,
          lead_id: lead.lead_id || null,
          first_name: lead.first_name,
          phone: lead.phone,
          profession: lead.profession,
          city: lead.city,
          status: 'pending',
        });
      } catch (e) {
        // Skip duplicates
        console.warn('[Import] Skipping duplicate:', lead.phone);
      }
    }
  }

  return NextResponse.json({
    success: true,
    batch_id: batchId,
    total_leads: enriched.length,
    imported: enriched.filter(l => l.phone).length,
    skipped: enriched.filter(l => !l.phone).length,
    campaign_id,
  });
}

// ─── Create batch manually ───
async function createBatch(body: Record<string, unknown>) {
  const { campaign_id, name, city_filter, profession_filter } = body;
  if (!campaign_id || !name) {
    return NextResponse.json({ error: 'campaign_id and name required' }, { status: 400 });
  }
  const client = tb();
  const res = await client.records('sms_batches').create({
    campaign_id,
    name,
    status: 'draft',
    city_filter: city_filter || null,
    profession_filter: profession_filter || null,
  });
  return NextResponse.json({ success: true, batch: res });
}

// ─── Sync ADB state → mark sent/replied ───
async function syncFromAdb(_body: Record<string, unknown>) {
  const client = tb();
  const updates: string[] = [];

  if (!existsSync(ADB_STATE)) {
    return NextResponse.json({ updated: 0, message: 'No ADB state file' });
  }

  const state = JSON.parse(readFileSync(ADB_STATE, 'utf-8'));
  const sentIds: string[] = state.sent || [];
  const repliedIds: string[] = state.replied || [];

  // Get all pending contacts
  const pendingRes = await client.records('sms_batch_contacts').list({
    filters: [{ column: 'status', op: 'equal', value: 'pending' }],
  });
  const pending = (pendingRes.records || []) as Record<string, unknown>[];

  for (const contact of pending) {
    const leadId = (contact.lead_id as string) || '';
    const phone = (contact.phone as string) || '';

    // Check if sent (by phone match or lead_id match)
    if (leadId && sentIds.includes(leadId)) {
      await client.records('sms_batch_contacts').update(contact.id as string, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      updates.push(`sent: ${contact.first_name || phone}`);
    }
  }

  // Get all sent contacts (to check replies)
  const sentRes = await client.records('sms_batch_contacts').list({
    filters: [{ column: 'status', op: 'equal', value: 'sent' }],
  });
  const sent = (sentRes.records || []) as Record<string, unknown>[];

  for (const contact of sent) {
    const leadId = (contact.lead_id as string) || '';
    if (leadId && repliedIds.includes(leadId)) {
      await client.records('sms_batch_contacts').update(contact.id as string, {
        status: 'replied',
        replied_at: new Date().toISOString(),
      });
      updates.push(`replied: ${contact.first_name || contact.phone}`);
    }
  }

  // Update batch counts
  const batchIds = new Set([...pending.map(c => c.batch_id as string), ...sent.map(c => c.batch_id as string)]);
  for (const bid of batchIds) {
    const batch = await client.records('sms_batches').read(bid);
    const batchContactsRes = await client.records('sms_batch_contacts').list({
      filters: [{ column: 'batch_id', op: 'equal', value: bid }],
    });
    const batchContacts = (batchContactsRes.records || []) as Record<string, unknown>[];
    const sentC = batchContacts.filter(c => c.status === 'sent' || c.status === 'replied').length;
    const repliedC = batchContacts.filter(c => c.status === 'replied').length;
    const total = batchContacts.length;
    await client.records('sms_batches').update(bid as string, {
      sent_count: sentC,
      reply_count: repliedC,
      total_count: total,
      status: repliedC > 0 ? 'done' : sentC > 0 ? 'sending' : 'draft',
    });
  }

  return NextResponse.json({
    updated: updates.length,
    updates,
    total_sent: sentIds.length,
    total_replied: repliedIds.length,
    state_file: ADB_STATE,
  });
}
