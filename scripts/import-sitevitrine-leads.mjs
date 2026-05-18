/**
 * Import SiteVitrine leads → sitevitrine_sites (TrailBase)
 * Usage: node scripts/import-sitevitrine-leads.mjs
 */

import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const TRAILBASE_URL = process.env.TRAILBASE_URL || 'http://localhost:4000';
const SOURCE_FILE = '/home/nadir/projects/site-vitrine/crm/contacts.ndjson';

async function waitForTrailBase(maxAttempts = 15) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(`${TRAILBASE_URL}/api/records/v1/sitevitrine_sites?limit=1`);
      if (res.ok || res.status === 401) return true;
    } catch {}
    console.log(`⏳ Attente TrailBase... (${i}/${maxAttempts})`);
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('TrailBase non disponible après 30s');
}

async function importLeads() {
  console.log('🔗 Vérification TrailBase...');
  await waitForTrailBase();

  const lines = readFileSync(SOURCE_FILE, 'utf8').trim().split('\n');
  const contacts = lines.map(l => JSON.parse(l));
  console.log(`📋 ${contacts.length} leads trouvés dans contacts.ndjson`);

  let ok = 0;
  let skip = 0;
  let err = 0;

  for (const c of contacts) {
    const payload = {
      name: c.name || c.company || '',
      phone: c.phone || '',
      sector: c.sector || '',
      address: c.address || '',
      site_url: c.site_url || '',
      status: c.site_status || 'draft',
      stage: c.stage || 'new',
      source: c.source || '',
      labels: JSON.stringify(c.labels || []),
      notes: (c.notes || '').substring(0, 500),
      google_maps_url: (c.google_maps_url || '').substring(0, 1000),
      created_at: c.created_at || new Date().toISOString(),
    };

    try {
      const res = await fetch(`${TRAILBASE_URL}/api/records/v1/sitevitrine_sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        ok++;
      } else {
        const text = await res.text();
        if (text.includes('UNIQUE') || text.includes('duplicate')) {
          skip++;
        } else {
          console.error(`  ❌ ${c.name}: ${res.status} ${text.substring(0, 100)}`);
          err++;
        }
      }
    } catch (e) {
      console.error(`  ❌ ${c.name}: ${e.message}`);
      err++;
    }
  }

  console.log(`\n✅ Import terminé:`);
  console.log(`   ${ok} importés`);
  if (skip > 0) console.log(`   ${skip} déjà existants (ignorés)`);
  if (err > 0) console.log(`   ${err} erreurs`);
}

importLeads().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
