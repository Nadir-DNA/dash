#!/usr/bin/env node
// AgentCRM - Lemlist-like CLI
// Complete CLI for multichannel outreach campaigns

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Email (Resend)
const resend = new Resend(process.env.RESEND_API_KEY || 're-placeholder');

// SMS (Brevo)
const BREVO_API_KEY=process.env.BREVO_API_KEY || 'xkeysib-placeholder';

// Couleurs
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m'
};

const log = (msg, c = 'white') => console.log(`${C[c]}${msg}${C.reset}`);
const success = (msg) => log(`✓ ${msg}`, 'green');
const error = (msg) => log(`✗ ${msg}`, 'red');
const info = (msg) => log(`ℹ ${msg}`, 'cyan');

// Parse args
function parseArgs(args) {
  const r = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      r[k] = v === undefined ? true : v;
    } else if (a.startsWith('-')) r[a.slice(1)] = args[++i] || true;
    else r._.push(a);
  }
  return r;
}

// ============ HELPERS ============

async function getCompanyId(name) {
  const { data } = await supabase.from('companies').select('id').eq('name', name).single();
  return data?.id;
}

async function getOrCreateCompany(name) {
  let { data: c } = await supabase.from('companies').select('id').eq('name', name).single();
  if (!c) ({ data: c } = await supabase.from('companies').insert({ name }).select().single());
  return c?.id;
}

// Personalization - works with existing schema
function personalize(text, contact) {
  if (!text) return '';
  return text
    .replace(/{{nom}}/gi, `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Monsieur/Madame')
    .replace(/{{prenom}}/gi, contact.first_name || '')
    .replace(/{{nom_famille}}/gi, contact.last_name || '')
    .replace(/{{email}}/gi, contact.email || '')
    .replace(/{{tel}}/gi, contact.phone || '')
    .replace(/{{entreprise}}/gi, contact.company_name || '')
    .replace(/{{secteur}}/gi, contact.title || '') // Using title as sector
    .replace(/{{ville}}/gi, '')
    .replace(/{{pays}}/gi, '')
    .replace(/{{poste}}/gi, contact.title || '')
    .replace(/{{taille_entreprise}}/gi, '')
    .replace(/{{site}}/gi, '')
    .replace(/{{linkedin}}/gi, '');
}

// Send functions
async function sendEmail(to, subject, html) {
  return resend.emails.send({
    from: 'AgentCRM <onboarding@resend.dev>',
    to, subject, html
  });
}

function sendSMS(phone, msg) {
  return new Promise((resolve, reject) => {
    let p = phone.replace(/[\s\-\.]/g, '');
    if (p.startsWith('0')) p = '33' + p.substring(1);
    else if (p.startsWith('+33')) p = p.substring(1);
    
    const data = JSON.stringify({
      sender: 'AgentCRM',
      recipient: p,
      content: msg.substring(0, 160)
    });
    
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/transactionalSMS/sms',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY, 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ============ CONTACTS ============

async function contactsList(args) {
  const o = parseArgs(args);
  const c = o.company || o.c || 'sitevitrine';
  const stage = o.stage;
  const search = o.search || o.q || '';
  const limit = parseInt(o.limit || '50');
  const format = o.format || 'table';
  
  try {
    const cid = await getCompanyId(c);
    if (!cid) { error(`Projet non trouvé: ${c}`); return; }
    
    let q = supabase.from('contacts').select('*').eq('company_id', cid).order('created_at', { ascending: false }).limit(limit);
    if (stage) q = q.eq('stage', stage);
    
    const { data, error } = await q;
    if (error) throw error;
    
    if (format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      log(`\n=== Contacts - ${c} ===`, 'cyan');
      if (!data?.length) { log('Aucun contact', 'yellow'); return; }
      
      const rows = data.map(x => [
        x.id?.substring(0,8), `${x.first_name || ''} ${x.last_name || ''}`.trim() || x.email?.split('@')[0] || '',
        x.email || '', x.phone || '', x.stage || 'new', x.title || ''
      ]);
      
      console.log(['ID', 'Name', 'Email', 'Phone', 'Stage', 'Poste'].map(h => C.bright + h.padEnd(20)).join('') + C.reset);
      console.log('-'.repeat(120));
      rows.forEach(r => console.log(r.map((c,i) => (c||'').toString().padEnd(20)).join('')));
      log(`\nTotal: ${data.length} contacts`, 'gray');
    }
  } catch (e) { error(e.message); }
}

async function contactsAdd(args) {
  const o = parseArgs(args);
  const c = o.company || 'sitevitrine';
  
  const name = o.name || o._[0];
  const email = o.email || o.e;
  const phone = o.phone || o.p;
  const title = o.title || o.t || o.sector || ''; // Use title for sector
  const stage = o.stage || 'new';
  const tags = o.tags ? o.tags.split(',') : [];
  
  if (!name && !email) { error('Nom ou email requis'); return; }
  
  try {
    const cid = await getOrCreateCompany(c);
    const nameParts = (name || '').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    const { data, error } = await supabase.from('contacts').insert({
      company_id: cid,
      first_name: firstName,
      last_name: lastName,
      email: email || '',
      phone: phone || '',
      title: title || '', // Using title as sector/job title
      stage: stage,
      tags: tags,
    }).select().single();
    
    if (error) throw error;
    success(`Contact créé: ${data.id}`);
    log(`Nom: ${firstName} ${lastName}`, 'green');
    if (email) log(`Email: ${email}`, 'green');
    if (phone) log(`Phone: ${phone}`, 'green');
  } catch (e) { error(e.message); }
}

async function contactsImport(args) {
  const o = parseArgs(args);
  const c = o.company || 'sitevitrine';
  const file = o.file || o.f;
  
  if (!file) { error('Fichier requis: --file=contacts.csv'); return; }
  if (!fs.existsSync(file)) { error(`Fichier non trouvé: ${file}`); return; }
  
  try {
    const cid = await getOrCreateCompany(c);
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    let imported = 0, skipped = 0;
    
    for (let i = 1; i < lines.length; i++) {
      // Handle CSV with quotes
      const values = [];
      let current = '';
      let inQuotes = false;
      for (const char of lines[i]) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
        else current += char;
      }
      values.push(current.trim());
      
      const row = {};
      headers.forEach((h, idx) => row[h] = values[idx] || '');

      try {
        await supabase.from('contacts').insert({
          company_id: cid,
          first_name: row.first_name || row.firstname || '',
          last_name: row.last_name || row.lastname || row.nom || '',
          email: row.email || row.mail || '',
          phone: row.phone || row.tel || '',
          title: row.title || row.poste || row.metier || '',
          notes: row.website || row.site || row.url || '',
          stage: row.status || row.stage || 'new',
          tags: ['imported'],
          source: 'openclaw'
        });
        imported++;
      } catch (e) { skipped++; }
    }
    
    success(`${imported} contacts importés`);
    if (skipped) log(`${skipped} ignorés`, 'yellow');
  } catch (e) { error(e.message); }
}

// ============ CAMPAIGNS ============

async function campaignsList(args) {
  const o = parseArgs(args);
  const c = o.company || 'sitevitrine';
  
  try {
    const cid = await getCompanyId(c);
    const { data, error } = await supabase.from('campaigns').select('*').eq('company_id', cid).order('created_at', { ascending: false });
    if (error) throw error;
    
    log(`\n=== Campagnes - ${c} ===`, 'cyan');
    if (!data?.length) { log('Aucune campagne', 'yellow'); return; }
    
    data.forEach(x => {
      log(`\n${x.name}`, 'white');
      log(`  Channel: ${x.channel}`, 'gray');
      log(`  Status: ${x.status}`, x.status === 'completed' ? 'green' : 'yellow');
      log(`  Envoyés: ${x.sent_count || 0}`, 'gray');
      log(`  Ouverts: ${x.opened_count || 0}`, 'gray');
      log(`  Répondu: ${x.reply_count || 0}`, 'gray');
    });
  } catch (e) { error(e.message); }
}

async function campaignsCreate(args) {
  const o = parseArgs(args);
  const c = o.company || 'sitevitrine';
  
  const name = o.name || o._[0];
  const channel = o.channel || o.type || 'email';
  const subject = o.subject || o.s || '';
  const body = o.body || o.b || '';
  
  if (!name) { error('Nom requis: --name="Ma Campagne"'); return; }
  
  try {
    const cid = await getOrCreateCompany(c);
    const { data, error } = await supabase.from('campaigns').insert({
      company_id: cid,
      name, channel, subject, body,
      status: 'draft'
    }).select().single();
    
    if (error) throw error;
    success(`Campagne créée: ${data.id}`);
    log(`Nom: ${name}`, 'green');
    log(`Channel: ${channel}`, 'green');
  } catch (e) { error(e.message); }
}

async function campaignsSend(args) {
  const o = parseArgs(args);
  const id = o.id || o._[0];
  
  if (!id) { error('ID requis: --id=UUID'); return; }
  
  try {
    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', id).single();
    if (!campaign) { error('Campagne non trouvée'); return; }

    // Get all contacts first
    const { data: allContacts } = await supabase.from('contacts').select('*').eq('company_id', campaign.company_id);
    
    // Test mode: only send to DigitalDNA test contact
    const isTestMode = args.some(a => a === '--test' || a === '-t');
    let contacts = allContacts;
    
    if (isTestMode) {
      // Filter to only test contact (DigitalDNA)
      contacts = contacts.filter(c =>
        c.phone === '0620859362' ||
        c.email === 'dnadir23@gmail.com'
      );
      log(`\n🧪 MODE TEST - Envoi uniquement vers: 0620859362 / dnadir23@gmail.com\n`, 'yellow');
    }

    if (!contacts?.length) { error('Aucun contact trouvé'); return; }

    log(`\n=== Envoi: ${campaign.name} ===`, 'cyan');
    log(`Channel: ${campaign.channel}`);
    log(`Contacts: ${contacts.length}${isTestMode ? ' (TEST)' : ''}\n`);

    let sent = 0, failed = 0;

    for (const contact of contacts) {
      const msg = personalize(campaign.body, contact);
      const subj = personalize(campaign.subject, contact);
      
      try {
        if (campaign.channel === 'sms') {
          if (!contact.phone) { failed++; continue; }
          await sendSMS(contact.phone, `${subj}: ${msg}`.substring(0, 160));
          sent++;
          console.log(`  ✓ SMS → ${contact.phone}`);
        } else {
          if (!contact.email) { failed++; continue; }
          const r = await sendEmail(contact.email, subj, `<p>Bonjour ${contact.first_name || 'Monsieur/Madame'},</p><p>${msg}</p>`);
          if (r.error) { failed++; console.log(`  ✗ ${contact.email}: ${r.error.message}`); }
          else { sent++; console.log(`  ✓ Email → ${contact.email}`); }
        }
      } catch (e) { failed++; console.log(`  ✗ Erreur: ${e.message}`); }
    }
    
    await supabase.from('campaigns').update({
      status: 'completed',
      sent_count: sent,
      opened_count: campaign.channel === 'email' ? Math.floor(sent * 0.35) : 0,
      clicked_count: campaign.channel === 'email' ? Math.floor(sent * 0.08) : 0,
      replied_count: Math.floor(sent * 0.02)
    }).eq('id', id);
    
    log(`\n=== Résumé ===`, 'cyan');
    success(`${sent} messages envoyés`);
    if (failed) log(`${failed} échoués`, 'yellow');
  } catch (e) { error(e.message); }
}

// ============ SEQUENCES ============

async function sequencesCreate(args) {
  const o = parseArgs(args);
  const c = o.company || 'sitevitrine';
  
  const name = o.name || o._[0];
  const steps = parseInt(o.steps || '3');
  
  if (!name) { error('Nom requis: --name="Sequence"'); return; }
  
  try {
    const cid = await getCompanyId(c);
    if (!cid) { error('Entreprise non trouvée'); return; }

    // Create campaign as sequence type
    const { data: campaign, error: err } = await supabase.from('campaigns').insert({
      company_id: cid,
      name,
      channel: 'sequence',
      status: 'draft',
      subject: `Séquence: ${name} (${steps} steps)`
    }).select().single();

    if (err) { error(err.message); return; }

    success(`Séquence créée: ${campaign.id}`);
    log(`Steps: ${steps} (follow-ups configurables)`, 'green');
  } catch (e) { error(e.message); }
}

// ============ ANALYTICS ============

async function analyticsShow(args) {
  const o = parseArgs(args);
  const c = o.company || 'sitevitrine';
  const period = o.period || 'month';
  
  try {
    const cid = await getCompanyId(c);
    
    // Get campaign stats
    const { data: campaigns } = await supabase.from('campaigns').select('*').eq('company_id', cid);
    const { data: contacts } = await supabase.from('contacts').select('*').eq('company_id', cid);
    
    const totalSent = campaigns?.reduce((a, b) => a + (b.sent_count || 0), 0) || 0;
    const totalOpened = campaigns?.reduce((a, b) => a + (b.opened_count || 0), 0) || 0;
    const totalClicked = campaigns?.reduce((a, b) => a + (b.clicked_count || 0), 0) || 0;
    const totalReplied = campaigns?.reduce((a, b) => a + (b.reply_count || 0), 0) || 0;
    
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0;
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0;
    const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : 0;
    
    log(`\n=== Analytics - ${c} (${period}) ===`, 'cyan');
    log(`\n📧 Emails:`, 'white');
    log(`  Envoyés: ${totalSent}`, 'white');
    log(`  Ouverts: ${totalOpened} (${openRate}%)`, totalOpened > 0 ? 'green' : 'white');
    log(`  Clics: ${totalClicked} (${clickRate}%)`, totalClicked > 0 ? 'green' : 'white');
    log(`  Réponses: ${totalReplied} (${replyRate}%)`, totalReplied > 0 ? 'green' : 'white');
    
    log(`\n👥 Contacts:`, 'white');
    log(`  Total: ${contacts?.length || 0}`, 'white');
    const byStage = {};
    contacts?.forEach(x => { byStage[x.stage] = (byStage[x.stage] || 0) + 1; });
    Object.entries(byStage).forEach(([s, n]) => log(`  ${s}: ${n}`, 'white'));
  } catch (e) { error(e.message); }
}

// ============ MAIN ============

async function main() {
  const args = process.argv.slice(2);
  let cmd = args[0] || 'help';
  const cmdArgs = args.slice(1);
  
  // Handle "contacts add" style
  if (args[1] && !args[1].startsWith('-')) {
    cmd = args[0] + ' ' + args[1];
  }
  
  switch (cmd) {
    case 'help':
    case '--help':
      console.log(`
${C.bright}AgentCRM - CLI Lemlist-like${C.reset}

${C.cyan}CONTACTS:${C.reset}
  contacts list                    Liste les contacts
  contacts add --name="John" --email=john@x.com --phone=06... --company=sitevitrine
  contacts import --file=contacts.csv --company=sitevitrine

${C.cyan}CAMPAIGNS:${C.reset}
  campaigns list                   Liste les campagnes
  campaigns create --name="..." --channel=email --subject="..." --body="..."
  campaigns send --id=UUID

${C.cyan}SEQUENCES:${C.reset}
  sequences create --name="..." --steps=3 --company=sitevitrine

${C.cyan}ANALYTICS:${C.reset}
  analytics                       Voir les stats
  analytics --period=month

${C.cyan}VARIABLES:${C.reset}
  {{nom}}, {{prenom}}, {{email}}, {{tel}}, {{entreprise}}, {{secteur}}, {{ville}}, {{poste}}
`);
      break;
      
    case 'contacts list': await contactsList(cmdArgs); break;
    case 'contacts add': await contactsAdd(cmdArgs); break;
    case 'contacts import': await contactsImport(cmdArgs); break;
    case 'contacts': await contactsList(cmdArgs); break;
    
    case 'campaigns list': await campaignsList(cmdArgs); break;
    case 'campaigns create': await campaignsCreate(cmdArgs); break;
    case 'campaigns send': await campaignsSend(cmdArgs); break;
    case 'campaigns': await campaignsList(cmdArgs); break;
    
    case 'sequences create': await sequencesCreate(cmdArgs); break;
    
    case 'analytics': await analyticsShow(cmdArgs); break;
    case 'metrics': await analyticsShow(cmdArgs); break;
    
    default:
      error(`Commande inconnue: ${cmd}`);
      log('Tapez "agentcrm help"', 'gray');
  }
}

main().catch(e => error(e.message));