import { NextResponse } from 'next/server';
import { initClient } from 'trailbase';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://psgsylbsjbgltigqfaoh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const STATE_FILE = `${homedir()}/.hermes/scripts/sms_prospection_state.json`;
const LOG_FILE = `${homedir()}/.hermes/scripts/sms_prospection_log.txt`;

function readStateFile() {
  if (!existsSync(STATE_FILE)) {
    return { sent: [], replied: [], last_offset: 0 };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { sent: [], replied: [], last_offset: 0 };
  }
}

function readLogFile(lines = 50) {
  if (!existsSync(LOG_FILE)) return [];
  try {
    const content = readFileSync(LOG_FILE, 'utf-8');
    const allLines = content.split('\n').filter(Boolean);
    return allLines.slice(-lines).reverse();
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // 1. Fetch from Trailbase
    const url = process.env.TRAILBASE_URL;
    let trailbaseCampaigns: Record<string, unknown>[] = [];
    if (url) {
      const client = initClient(url);
      const res = await client.records('campaigns').list({ order: ['-created_at'] });
      trailbaseCampaigns = (res.records || []).map((c: Record<string, unknown>) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        channel: c.channel,
        sent_count: c.sent_count || 0,
        open_count: c.open_count || 0,
        created_at: c.created_at,
        source: 'trailbase',
      }));
    }

    // 2. Fetch from Supabase (historical)
    let supabaseCampaigns: Record<string, unknown>[] = [];
    let supabaseSmsLogs: Record<string, unknown>[] = [];
    if (SUPABASE_KEY) {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      };
      const headerStr = Object.entries(headers)
        .map(([k, v]) => `-H "${k}: ${v}"`)
        .join(' ');

      // Fetch campaigns
      const campsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/campaigns?order=created_at.desc`, 
        { headers }
      );
      if (campsRes.ok) {
        const data = await campsRes.json();
        supabaseCampaigns = (Array.isArray(data) ? data : []).map((c: Record<string, unknown>) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          channel: c.channel,
          sent_count: c.sent_count || 0,
          open_count: c.open_count || 0,
          created_at: c.created_at,
          source: 'supabase',
        }));
      }

      // Fetch SMS logs (last 200)
      const logsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/sms_logs?order=sent_at.desc&limit=200`,
        { headers }
      );
      if (logsRes.ok) {
        const data = await logsRes.json();
        supabaseSmsLogs = (Array.isArray(data) ? data : []).map((l: Record<string, unknown>) => ({
          id: l.id,
          phone: l.phone,
          status: l.status,
          sent_at: l.sent_at,
          message: (l.message as string || '').substring(0, 80),
          campaign_id: l.campaign_id,
        }));
      }
    }

    // 3. Read ADB script state (live sends)
    const adbState = readStateFile();
    const recentLogs = readLogFile(20);

    // 4. Compute aggregate stats
    const allSmsCampaigns = [
      ...trailbaseCampaigns.filter(c => (c as any).channel === 'sms'),
      ...supabaseCampaigns.filter(c => (c as any).channel === 'sms'),
    ];

    const totalSentViaAdb = (adbState.sent || []).length;
    const totalReplies = (adbState.replied || []).length;
    const supabaseSentThisMonth = supabaseSmsLogs.filter((l: Record<string, unknown>) => {
      const sent = l.sent_at as string;
      if (!sent) return false;
      return sent >= new Date(Date.now() - 30 * 86400000).toISOString();
    }).length;

    return NextResponse.json({
      campaigns: allSmsCampaigns.slice(0, 50),
      recentLogs: supabaseSmsLogs.slice(0, 100),
      adbSmsState: {
        totalSent: totalSentViaAdb,
        totalReplies,
        sentContactIds: adbState.sent || [],
        repliedContactIds: adbState.replied || [],
      },
      adbRecentLogs: recentLogs,
      stats: {
        totalCampaigns: allSmsCampaigns.length,
        activeCampaigns: allSmsCampaigns.filter(c => (c as any).status === 'active').length,
        totalSmsSent: allSmsCampaigns.reduce((s, c) => s + ((c as any).sent_count || 0), 0) + totalSentViaAdb,
        supabaseSentThisMonth,
        adbTotalSent: totalSentViaAdb,
        adbTotalReplies: totalReplies,
        replyRate: totalSentViaAdb > 0 ? Math.round((totalReplies / totalSentViaAdb) * 100) : 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching SMS campaigns:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
