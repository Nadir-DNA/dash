#!/usr/bin/env node

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  console.log('Make sure your .env file has these variables set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Couleurs pour le terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function log(msg, color = 'white') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function error(msg) {
  console.error(`${colors.red}Error: ${msg}${colors.reset}`);
}

function success(msg) {
  console.log(`${colors.green}✓ ${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`);
}

function header(msg) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`);
}

function table(headers, rows) {
  const colWidths = headers.map((h, i) => 
    Math.max(h.length, ...rows.map(r => String(r[i] || '').length))
  );
  
  console.log(headers.map((h, i) => colors.bright + h.padEnd(colWidths[i])).join('  ') + colors.reset);
  console.log(colWidths.map(w => '-'.repeat(w)).join('  '));
  
  rows.forEach(row => {
    console.log(row.map((cell, i) => String(cell || '').padEnd(colWidths[i])).join('  '));
  });
}

// Parse arguments
function parseArgs(args) {
  const result = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result[key] = value === undefined ? true : value;
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      result[key] = args[++i] || true;
    } else {
      result._.push(arg);
    }
  }
  return result;
}

// ============ HELPERS ============

async function getCompanyId(companyName) {
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('name', companyName)
    .single();
  
  if (error || !data) return null;
  return data.id;
}

async function getOrCreateCompany(companyName) {
  // Try to find existing
  let { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('name', companyName)
    .single();
  
  if (company) return company.id;
  
  // Create new
  const { data, error } = await supabase
    .from('companies')
    .insert({ name: companyName })
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}

// ============ COMMANDES CONTACTS ============

async function cmdContactsList(args) {
  const opts = parseArgs(args);
  const companyName = opts.company || opts.c || 'sitevitrine';
  const stage = opts.stage;
  const search = opts.search || opts.q || '';
  const limit = parseInt(opts.limit || '100');
  const format = opts.format || 'table';
  
  try {
    const companyId = await getCompanyId(companyName);
    
    if (!companyId) {
      error(`Company not found: ${companyName}`);
      return;
    }
    
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('company_id', companyId);
    
    if (stage) {
      query = query.eq('stage', stage);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    const { data: contacts, error } = await query.limit(limit);
    
    if (error) throw error;
    
    if (format === 'json') {
      console.log(JSON.stringify(contacts, null, 2));
    } else {
      header(`Contacts - ${companyName}`);
      if (!contacts || contacts.length === 0) {
        log('Aucun contact trouvé', 'yellow');
      } else {
        const rows = contacts.map(c => [
          c.id?.substring(0, 8) || '',
          `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || '',
          c.email || '',
          c.phone || '',
          c.stage || 'new',
          c.title || ''
        ]);
        table(['ID', 'Name', 'Email', 'Phone', 'Stage', 'Title'], rows);
        log(`\nTotal: ${contacts.length} contacts`, 'gray');
      }
    }
  } catch (err) {
    error(err.message);
  }
}

async function cmdContactsAdd(args) {
  const opts = parseArgs(args);
  const companyName = opts.company || opts.c || 'sitevitrine';
  
  const name = opts.name || opts._[0];
  const email = opts.email || opts.e;
  const phone = opts.phone || opts.p;
  const sector = opts.sector || opts.s;
  const stage = opts.stage || 'new';
  
  if (!name) {
    error('Le nom est requis. Usage: --name="John Doe"');
    return;
  }
  
  try {
    const companyId = await getOrCreateCompany(companyName);
    
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        company_id: companyId,
        first_name: firstName,
        last_name: lastName,
        email: email || '',
        phone: phone || '',
        title: sector || '',
        stage: stage,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    success(`Contact créé: ${data.id}`);
    log(`Nom: ${name}`, 'green');
    if (email) log(`Email: ${email}`, 'green');
    if (phone) log(`Phone: ${phone}`, 'green');
    log(`Stage: ${stage}`, 'green');
  } catch (err) {
    error(err.message);
  }
}

async function cmdContactsUpdate(args) {
  const opts = parseArgs(args);
  const companyName = opts.company || 'sitevitrine';
  const contactId = opts.id || opts._[0];
  
  if (!contactId) {
    error('ID du contact requis. Usage: --id=uuid --name="Nouveau nom"');
    return;
  }
  
  try {
    const updates = {};
    if (opts.name) {
      const nameParts = opts.name.split(' ');
      updates.first_name = nameParts[0];
      updates.last_name = nameParts.slice(1).join(' ');
    }
    if (opts.email) updates.email = opts.email;
    if (opts.phone) updates.phone = opts.phone;
    if (opts.sector) updates.title = opts.sector;
    if (opts.stage) updates.stage = opts.stage;
    
    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contactId);
    
    if (error) throw error;
    
    success(`Contact mis à jour: ${contactId}`);
  } catch (err) {
    error(err.message);
  }
}

async function cmdContactsDelete(args) {
  const opts = parseArgs(args);
  const contactId = opts.id || opts._[0];
  
  if (!contactId) {
    error('ID du contact requis. Usage: --id=uuid');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);
    
    if (error) throw error;
    
    success(`Contact supprimé: ${contactId}`);
  } catch (err) {
    error(err.message);
  }
}

async function cmdContactsImport(args) {
  const opts = parseArgs(args);
  const companyName = opts.company || 'sitevitrine';
  const file = opts.file || opts.f;
  
  if (!file) {
    error('Fichier requis. Usage: --file=contacts.csv');
    return;
  }
  
  if (!fs.existsSync(file)) {
    error(`Fichier non trouvé: ${file}`);
    return;
  }
  
  try {
    const companyId = await getOrCreateCompany(companyName);
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    let imported = 0;
    let skipped = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      
      try {
        const nameParts = (row.name || row.nom || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        await supabase.from('contacts').insert({
          company_id: companyId,
          first_name: firstName,
          last_name: lastName,
          email: row.email || row.mail || '',
          phone: row.phone || row.tel || '',
          title: row.sector || row.secteur || '',
          stage: row.stage || 'new',
        });
        imported++;
      } catch (e) {
        skipped++;
      }
    }
    
    success(`Import terminé: ${imported} contacts importés`);
    if (skipped > 0) {
      log(`${skipped} contacts ignorés`, 'yellow');
    }
  } catch (err) {
    error(err.message);
  }
}

// ============ COMMANDES COMPANIES ============

async function cmdCompaniesList(args) {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    header('Projets/Entreprises');
    
    if (!companies || companies.length === 0) {
      log('Aucun projet trouvé', 'yellow');
      log('Créer un projet: agentcrm companies create --name="Mon Projet"', 'gray');
    } else {
      // Get contact counts
      const rows = await Promise.all(companies.map(async c => {
        const { count } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', c.id);
        return [c.name, count || 0];
      }));
      
      table(['Name', 'Contacts'], rows);
    }
  } catch (err) {
    error(err.message);
  }
}

async function cmdCompaniesCreate(args) {
  const opts = parseArgs(args);
  const name = opts.name || opts._[0];
  
  if (!name) {
    error('Nom requis. Usage: --name="Mon Projet"');
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('companies')
      .insert({ name })
      .select()
      .single();
    
    if (error) throw error;
    
    success(`Projet créé: ${name}`);
  } catch (err) {
    error(err.message);
  }
}

async function cmdCompaniesDelete(args) {
  const opts = parseArgs(args);
  const name = opts.name || opts._[0];
  
  if (!name) {
    error('Nom requis. Usage: --name="Mon Projet"');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('name', name);
    
    if (error) throw error;
    
    success(`Projet supprimé: ${name}`);
  } catch (err) {
    error(err.message);
  }
}

// ============ COMMANDES PIPELINE ============

async function cmdPipelineStats(args) {
  const opts = parseArgs(args);
  const companyName = opts.company || 'sitevitrine';
  
  try {
    const companyId = await getCompanyId(companyName);
    
    if (!companyId) {
      error(`Company not found: ${companyName}`);
      return;
    }
    
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('stage')
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    const stages = {
      new: contacts.filter(c => c.stage === 'new').length,
      contacted: contacts.filter(c => c.stage === 'contacted').length,
      qualified: contacts.filter(c => c.stage === 'qualified').length,
      proposal: contacts.filter(c => c.stage === 'proposal').length,
      negotiation: contacts.filter(c => c.stage === 'negotiation').length,
      won: contacts.filter(c => c.stage === 'won').length,
      lost: contacts.filter(c => c.stage === 'lost').length,
    };
    
    header(`Pipeline - ${companyName}`);
    
    const total = Object.values(stages).reduce((a, b) => a + b, 0);
    
    Object.entries(stages).forEach(([stage, count]) => {
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
      log(`${stage.padEnd(12)} ${count.toString().padStart(3)} ${bar} ${pct}%`, 'cyan');
    });
    
    log(`\nTotal: ${total} contacts`, 'gray');
  } catch (err) {
    error(err.message);
  }
}

async function cmdPipelineMove(args) {
  const opts = parseArgs(args);
  const contactId = opts.id || opts._[0];
  const newStage = opts.stage || opts._[1];
  
  if (!contactId || !newStage) {
    error('Usage: pipeline move --id=uuid --stage=interested');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('contacts')
      .update({ stage: newStage })
      .eq('id', contactId);
    
    if (error) throw error;
    
    success(`Contact déplacé vers: ${newStage}`);
  } catch (err) {
    error(err.message);
  }
}

// ============ COMMANDES CAMPAIGNS ============

async function cmdCampaignsList(args) {
  const opts = parseArgs(args);
  const companyName = opts.company || 'sitevitrine';
  
  try {
    const companyId = await getCompanyId(companyName);
    
    let query = supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter by company if it exists
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    const { data: campaigns, error } = await query;
    
    if (error) throw error;
    
    header('Campagnes');
    
    if (!campaigns || campaigns.length === 0) {
      log('Aucune campagne trouvée', 'yellow');
      log('Créer une campagne: agentcrm campaigns create --name="Ma Campagne" --channel=email', 'gray');
    } else {
      const rows = campaigns.map(c => [
        c.name || c.id?.substring(0, 8),
        c.channel || 'email',
        c.status || 'draft',
        c.sent_count || 0,
        c.open_count || 0,
        c.reply_count || 0
      ]);
      table(['Name', 'Channel', 'Status', 'Sent', 'Opened', 'Replied'], rows);
    }
  } catch (err) {
    error(err.message);
  }
}

async function cmdCampaignsCreate(args) {
  const opts = parseArgs(args);
  const companyName = opts.company || 'sitevitrine';
  
  const name = opts.name || opts._[0];
  const channel = opts.channel || opts.type || 'email';
  const subject = opts.subject || opts.s || '';
  const body = opts.body || opts.b || '';
  
  if (!name) {
    error('Nom requis. Usage: --name="Ma Campagne" --channel=email');
    return;
  }
  
  try {
    const companyId = await getCompanyId(companyName);
    
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        company_id: companyId,
        name: name,
        channel: channel,
        status: 'draft',
        subject: subject,
        body: body,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    success(`Campagne créée: ${data.id}`);
    log(`Nom: ${name}`, 'green');
    log(`Channel: ${channel}`, 'green');
    log(`Statut: draft (à configurer)`, 'yellow');
  } catch (err) {
    error(err.message);
  }
}

async function cmdCampaignsSend(args) {
  const opts = parseArgs(args);
  const campaignId = opts.id || opts._[0];
  
  if (!campaignId) {
    error('ID de campagne requis. Usage: --id=uuid');
    return;
  }
  
  try {
    // Get campaign
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    
    if (fetchError || !campaign) {
      error('Campagne non trouvée');
      return;
    }
    
    // Get contacts for this company
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('company_id', campaign.company_id);
    
    if (contactsError) throw contactsError;
    
    // Update campaign status (use 'active' instead of 'sending')
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        status: 'active',
        sent_count: contacts?.length || 0 
      })
      .eq('id', campaignId);
    
    if (updateError) throw updateError;
    
    success(`Campagne "${campaign.name}" en cours d'envoi!`);
    log(`${contacts?.length || 0} contacts à contacter`, 'green');
    
    // Simulate sending (in real app, this would call an email/SMS API)
    await supabase
      .from('campaigns')
      .update({ 
        status: 'completed',
        sent_count: contacts?.length || 0,
        open_count: Math.floor((contacts?.length || 0) * 0.4),
        click_count: Math.floor((contacts?.length || 0) * 0.1),
        reply_count: Math.floor((contacts?.length || 0) * 0.02)
      })
      .eq('id', campaignId);
    
    log('Campagne terminée!', 'green');
  } catch (err) {
    error(err.message);
  }
}

// ============ COMMANDES METRICS ============

async function cmdMetrics(args) {
  const opts = parseArgs(args);
  const companyName = opts.company || 'sitevitrine';
  
  try {
    const companyId = await getCompanyId(companyName);
    
    if (!companyId) {
      error(`Company not found: ${companyName}`);
      return;
    }
    
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    header(`Métriques - ${companyName}`);
    
    const total = contacts.length;
    const contacted = contacts.filter(c => c.stage === 'contacted').length;
    const qualified = contacts.filter(c => c.stage === 'qualified').length;
    const won = contacts.filter(c => c.stage === 'won').length;
    
    const conversionRate = total > 0 ? ((qualified / total) * 100).toFixed(1) : 0;
    const winRate = total > 0 ? ((won / total) * 100).toFixed(1) : 0;
    
    log(`Total contacts:     ${total}`, 'white');
    log(`Contactés:          ${contacted} (${((contacted/total)*100).toFixed(1)}%)`, 'cyan');
    log(`Qualifiés:          ${qualified} (${conversionRate}%)`, 'green');
    log(`Gagnés:             ${won} (${winRate}%)`, 'green');
  } catch (err) {
    error(err.message);
  }
}

// ============ MAIN ============

async function main() {
  const args = process.argv.slice(2);
  
  // Combine first two args to handle "contacts add" style commands
  let command = args[0] || 'help';
  let cmdArgs = args.slice(1);
  
  // Handle compound commands like "contacts add"
  if (args[1] && !args[1].startsWith('-')) {
    command = args[0] + ' ' + args[1];
    cmdArgs = args.slice(2);
  }
  
  switch (command) {
    case 'help':
    case '--help':
      console.log(`
${colors.bright}AgentCRM CLI - Gestion complète du CRM (Supabase)${colors.reset}

Usage: agentcrm <commande> [options]

${colors.cyan}COMMANDES CONTACTS:${colors.reset}
  contacts list                    Liste les contacts
  contacts add --name="John"       Ajoute un contact
  contacts update --id=uuid         Met à jour un contact
  contacts delete --id=uuid        Supprime un contact
  contacts import --file=data.csv  Importe depuis CSV

${colors.cyan}COMMANDES PIPELINE:${colors.reset}
  pipeline stats                   Statistiques du pipeline
  pipeline move --id=uuid --stage=interested

${colors.cyan}COMMANDES COMPANIES:${colors.reset}
  companies list                   Liste les projets
  companies create --name="..."   Crée un projet
  companies delete --name=...    Supprime un projet

${colors.cyan}COMMANDES METRICS:${colors.reset}
  metrics                          Affiche les métriques

${colors.cyan}OPTIONS GLOBALES:${colors.reset}
  --company=nom                   Projet à utiliser

${colors.cyan}EXEMPLES:${colors.reset}
  agentcrm contacts list --company="Amens Test"
  agentcrm contacts add --name="John Doe" --email=john@example.com --company="Amens Test"
  agentcrm pipeline stats --company="Amens Test"
`);
      break;
    
    case 'contacts list':
      await cmdContactsList(cmdArgs);
      break;
    case 'contacts add':
      await cmdContactsAdd(cmdArgs);
      break;
    case 'contacts update':
      await cmdContactsUpdate(cmdArgs);
      break;
    case 'contacts delete':
      await cmdContactsDelete(cmdArgs);
      break;
    case 'contacts import':
      await cmdContactsImport(cmdArgs);
      break;
    case 'contacts':
      await cmdContactsList(cmdArgs);
      break;
    
    case 'pipeline':
    case 'pipeline stats':
      await cmdPipelineStats(cmdArgs);
      break;
    case 'pipeline move':
      await cmdPipelineMove(cmdArgs);
      break;

    case 'campaigns list':
      await cmdCampaignsList(cmdArgs);
      break;
    case 'campaigns create':
      await cmdCampaignsCreate(cmdArgs);
      break;
    case 'campaigns send':
      await cmdCampaignsSend(cmdArgs);
      break;
    case 'campaigns':
      await cmdCampaignsList(cmdArgs);
      break;

    case 'metrics':
      await cmdMetrics(cmdArgs);
      break;
    
    case 'companies':
    case 'companies list':
      await cmdCompaniesList(cmdArgs);
      break;
    case 'companies create':
      await cmdCompaniesCreate(cmdArgs);
      break;
    case 'companies delete':
      await cmdCompaniesDelete(cmdArgs);
      break;
    
    default:
      error(`Commande inconnue: ${command}`);
      log('Tapez "agentcrm help" pour voir les commandes disponibles', 'gray');
      process.exit(1);
  }
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});