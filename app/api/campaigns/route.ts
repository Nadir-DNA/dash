import { NextRequest, NextResponse } from 'next/server';
import { initClient } from 'trailbase';

function getClient() {
  const url = process.env.TRAILBASE_URL;
  if (!url) throw new Error('Missing TRAILBASE_URL');
  return initClient(url);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get('project_id') || 'sitevitrine';
    const client = getClient();

    // Get company ID
    const companyRes = await client
      .records('companies')
      .list({ filters: [{ column: 'name', op: 'equal', value: projectName }] });

    const company = companyRes.records?.[0];
    if (!company) {
      return NextResponse.json({ campaigns: [] });
    }

    // Get campaigns
    const campaignsRes = await client
      .records('campaigns')
      .list({
        filters: [{ column: 'company_id', op: 'equal', value: company.id as string }],
        order: ['-created_at'],
      });

    const formatted = (campaignsRes.records || []).map((c: Record<string, unknown>) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      sent_count: (c.sent_count as number) || 0,
      open_count: (c.open_count as number) || 0,
      click_count: (c.click_count as number) || 0,
      reply_count: (c.reply_count as number) || 0,
      created_at: c.created_at,
    }));

    return NextResponse.json({ campaigns: formatted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching campaigns:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
