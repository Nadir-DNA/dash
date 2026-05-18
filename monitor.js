#!/usr/bin/env node
// AgentCRM Monitor - Vérifie l'état du CRM

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStatus() {
  console.log('\n=== AgentCRM Status ===\n');
  
  // Companies
  const { data: companies } = await supabase.from('companies').select('*').order('name');
  console.log('🏢 Entreprises:', companies?.length || 0);
  companies?.forEach(c => console.log(`   - ${c.name}`));
  
  // Contacts par entreprise
  console.log('\n📇 Contacts:');
  for (const company of companies || []) {
    const { count } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('company_id', company.id);
    console.log(`   - ${company.name}: ${count} contacts`);
  }
  
  // Campagnes
  const { data: campaigns } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  console.log('\n📧 Campagnes:', campaigns?.length || 0);
  campaigns?.forEach(c => {
    console.log(`   - ${c.name} (${c.channel}) - ${c.status} - ${c.sent_count} envoyés`);
  });
  
  // Dernier contact ajouté
  const { data: lastContact } = await supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(1).single();
  if (lastContact) {
    console.log('\n👤 Dernier contact:');
    console.log(`   - ${lastContact.first_name} ${lastContact.last_name}`);
    console.log(`   - ${lastContact.email}`);
    console.log(`   - ${lastContact.phone}`);
  }
  
  console.log('\n=======================\n');
}

checkStatus().catch(console.error);