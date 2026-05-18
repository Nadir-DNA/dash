const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://psgsylbsjbgltigqfaoh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZ3N5bGJzamJnbHRpZ3FmYW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIyODAyNCwiZXhwIjoyMDg1ODA0MDI0fQ.Njfffg9JrxJ2sRBnm9WvGkgJgiqjn1pDhJN31tkE0WY';

async function importNDJSON(projectId = 'sitevitrine') {
  console.log(`📥 Importing NDJSON to Supabase (${projectId})...`);
  
  const ndjsonFile = path.join('companies', projectId, 'crm', 'contacts.ndjson');
  const ndjson = fs.readFileSync(ndjsonFile, 'utf-8');
  const lines = ndjson.trim().split('\n').filter(l => l.trim());
  
  console.log(`📊 Found ${lines.length} contacts`);
  
  // Get company ID
  const companiesRes = await fetch(`${SUPABASE_URL}/rest/v1/companies?name=eq.${projectId}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const companies = await companiesRes.json();
  const companyId = companies[0]?.id;
  
  if (!companyId) {
    console.error('❌ Company not found');
    return;
  }
  
  // Clear existing
  await fetch(`${SUPABASE_URL}/rest/v1/contacts?company_id=eq.${companyId}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  
  // Import
  let imported = 0;
  for (const line of lines) {
    const c = JSON.parse(line);
    
    // Map NDJSON fields to Supabase schema
    const siteInfo = c.site_status === 'deployed' ? `Site déployé: ${c.site_url}` : '';
    const contact = {
      company_id: companyId,
      first_name: c.name?.split(' ')[0] || '',
      last_name: c.name?.split(' ').slice(1).join(' ') || '',
      phone: c.phone || '',
      title: c.sector || '',
      stage: c.stage || 'new',
      notes: `${c.notes || ''} ${c.google_maps_url || ''} ${siteInfo}`.trim(),
      tags: c.labels || [],
      source: c.source || 'ndjson'
    };
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(contact)
    });
    
    if (res.ok) imported++;
  }
  
  console.log(`✅ Imported ${imported}/${lines.length} contacts`);
}

if (require.main === module) {
  importNDJSON(process.argv[2] || 'sitevitrine').catch(console.error);
}

module.exports = importNDJSON;
