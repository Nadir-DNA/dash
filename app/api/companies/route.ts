import { NextResponse } from 'next/server';
import { initClient } from 'trailbase';

export async function GET() {
  try {
    const url = process.env.TRAILBASE_URL;
    if (!url) throw new Error('Missing TRAILBASE_URL');
    const client = initClient(url);

    const res = await client.records('companies').list({ order: ['name'] });
    const companies = res.records || [];

    // Transform for frontend
    const formattedCompanies = companies.map((c: Record<string, unknown>) => ({
      id: c.name, // Use name as ID for the frontend
      name: c.name,
      contacts_count: 0, // Will be calculated separately if needed
    }));

    return NextResponse.json({ data: formattedCompanies });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching companies:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
