const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://psgsylbsjbgltigqfaoh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZ3N5bGJzamJnbHRpZ3FmYW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIyODAyNCwiZXhwIjoyMDg1ODA0MDI0fQ.Njfffg9JrxJ2sRBnm9WvGkgJgiqjn1pDhJN31tkE0WY';

async function syncToSupabase(projectId = 'sitevitrine') {
  console.log(`🔄 Syncing ${projectId} to Supabase...`);
  
  // Read local NDJSON
  const contactsFile = path.join('companies', projectId, 'crm', 'contacts.ndjson');
  const ndjson = fs.readFileSync(contactsFile, 'utf-8');
  const lines = ndjson.trim().split('\n').filter(l => l.trim());
  
  console.log(`📊 Found ${lines.length} contacts`);
  
  // Clear existing prospects
  console.log('🗑️  Clearing existing prospects...');
  await fetch(`${SUPABASE_URL}/rest/v1/prospects`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal'
    }
  });
  
  // Insert contacts
  console.log('📥 Inserting contacts...');
  let inserted = 0;
  
  for (const line of lines) {
    const contact = JSON.parse(line);
    
    const prospect = {
      nom_entreprise: contact.name || contact.company,
      metier: contact.sector,
      ville: contact.address?.split(',').pop()?.trim() || '',
      telephone: contact.phone,
      created_at: contact.created_at || new Date().toISOString()
    };
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/prospects`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(prospect)
    });
    
    if (res.ok) inserted++;
  }
  
  console.log(`✅ Synced ${inserted}/${lines.length} contacts to Supabase`);
}

// Run if called directly
if (require.main === module) {
  const projectId = process.argv[2] || 'sitevitrine';
  syncToSupabase(projectId).catch(console.error);
}

module.exports = syncToSupabase;
