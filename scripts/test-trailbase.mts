/**
 * Quick integration test for Dash Metrics Trailbase connectivity.
 * Usage: npx tsx scripts/test-trailbase.mts
 */
import { initClient } from 'trailbase';

const BASE = process.env.TRAILBASE_URL || 'http://localhost:4000';
const EMAIL = process.env.TRAILBASE_EMAIL || '';
const PASSWORD = process.env.TRAILBASE_PASSWORD || '';

async function main() {
  console.log('=== Trailbase Connectivity Test ===\n');
  console.log(`URL: ${BASE}`);
  console.log(`Auth: ${EMAIL ? `configured (${EMAIL})` : 'NOT CONFIGURED'}\n`);

  const client = initClient(BASE);

  if (EMAIL && PASSWORD) {
    try {
      await client.login(EMAIL, PASSWORD);
      console.log('✓ Login successful');
      const user = client.user();
      console.log(`  User: ${user?.email} (admin: ${user?.admin})`);
    } catch (e: any) {
      console.log(`✗ Login failed: ${e?.message || e}`);
    }
  } else {
    console.log('⚠ Skipping login — credentials empty');
  }

  // Test: try to read tables that the connectors expect
  const tables = [
    'companies', 'contacts', 'campaigns', 'sms_batches',
    'leagueplay_players', 'leagueplay_games', 'leagueplay_teams',
    'sitevitrine_sites',
    'flashcert_users', 'flashcert_conversions', 'flashcert_cpf_submissions', 'flashcert_page_views',
    'dash_project_config',
  ];

  console.log('');
  for (const table of tables) {
    try {
      const result = await (client.records(table) as any).list({ pagination: { limit: 1 }, count: true });
      const count = (result as any)?.total_count ?? '?';
      console.log(`  ${table}: EXISTS (total_count: ${count})`);
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('404') || msg.includes('not found') || msg.includes('No route')) {
        console.log(`  ${table}: NOT FOUND`);
      } else {
        console.log(`  ${table}: ERROR — ${msg.slice(0, 120)}`);
      }
    }
  }
}

main();
