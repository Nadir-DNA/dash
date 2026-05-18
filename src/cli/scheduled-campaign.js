#!/usr/bin/env node
/**
 * Scheduled Campaign Runner
 * Sends 10 SMS per day at 10:30 AM to sitevitrine prospects
 * 
 * Usage: node src/cli/scheduled-campaign.js
 * Run via cron: 30 10 * * * cd /home/nadir/projects/agentcrm && node src/cli/scheduled-campaign.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// SMS Template
const SMS_TEMPLATE = `Bonjour {{entreprise}}, j'ai vu que la concurrence avait pour la plupart un site web. Pour être plus efficace sur votre marché je me suis permit de vous creer un site web {{site}}. N'hesitez pas si vous souhaitez plus d'info DigitalDNA 0620859362 contact@thedigitaldna.fr`;

// Config
const DAILY_LIMIT = 10;
const COMPANY_NAME = 'sitevitrine';

// Force reload .env to get correct key
require('dotenv').config({ override: true });
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const https = require('https');

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
        try { 
          const result = JSON.parse(d);
          // Return both the result and message ID
          resolve({ ...result, messageId: result.messageId });
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function extractWebsite(notes) {
  if (!notes) return '';
  // Support both "Site déployé:" format and direct URL
  const match = notes.match(/https:\/\/site-vitrine-hub\.vercel\.app\/[^\s]+/) 
    || notes.match(/(https?:\/\/[^\s]+)/);
  return match ? match[0] : '';
}

function personalize(text, contact) {
  const website = extractWebsite(contact.notes);
  return text
    .replace(/{{entreprise}}/gi, contact.last_name || contact.first_name || 'Monsieur/Madame')
    .replace(/{{site}}/gi, website || 'votre site');
}

async function getCompanyId(name) {
  const { data } = await supabase.from('companies').select('id').eq('name', name).single();
  return data?.id;
}

async function runScheduledCampaign() {
  console.log(`\n🚀 === Campagne programmée - ${new Date().toISOString()} ===\n`);

  try {
    // Get company ID
    const companyId = await getCompanyId(COMPANY_NAME);
    if (!companyId) {
      console.log('❌ Entreprise non trouvée: ' + COMPANY_NAME);
      process.exit(1);
    }

    // Get contacts with status 'new' or 'a-contacter'
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .in('stage', ['new', 'a-contacter'])
      .not('phone', 'is', null)
      .order('created_at', { ascending: true })
      .limit(DAILY_LIMIT);

    if (error) throw error;

    if (!contacts || contacts.length === 0) {
      console.log('⏭️  Aucun contact à contacter aujourd\'hui !');
      process.exit(0);
    }

    console.log(`📋 ${contacts.length} prospects à contacter aujourd'hui\n`);

    let sent = 0;
    let failed = 0;
    const smsLogs = [];

    for (const contact of contacts) {
      const message = personalize(SMS_TEMPLATE, contact);
      
      console.log(`→ ${contact.last_name}: ${message.substring(0, 50)}...`);

      try {
        const result = await sendSMS(contact.phone, message);
        const msgId = result.messageId ? String(result.messageId) : null;
        
        // Log to database
        const { data: log } = await supabase.from('sms_logs').insert({
          contact_id: contact.id,
          phone: contact.phone,
          message: message.substring(0, 160),
          brevo_id: msgId,
          status: msgId ? 'sent' : 'error',
          error: msgId ? null : 'No message ID returned'
        }).select().single();

        console.log(`  ✓ SMS envoyé à ${contact.phone} (ID: ${msgId || 'N/A'})`);
        
        // Update contact as contacted
        await supabase
          .from('contacts')
          .update({ 
            stage: 'contacted',
            last_contacted_at: new Date().toISOString()
          })
          .eq('id', contact.id);

        sent++;
        if (result.messageId) smsLogs.push({ phone: contact.phone, id: result.messageId });
      } catch (e) {
        // Log error
        await supabase.from('sms_logs').insert({
          contact_id: contact.id,
          phone: contact.phone,
          message: message.substring(0, 160),
          status: 'error',
          error: e.message
        });
        console.log(`  ✗ Erreur: ${e.message}`);
        failed++;
      }
    }

    console.log(`\n✅ Résumé: ${sent} envoyés, ${failed} échoués`);
    
    // Log campaign
    await supabase.from('campaigns').insert({
      company_id: companyId,
      name: `Campagne auto ${new Date().toISOString().split('T')[0]}`,
      channel: 'sms',
      status: 'completed',
      sent_count: sent,
      subject: 'Site web gratuit'
    });

  } catch (e) {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runScheduledCampaign();
}

module.exports = { runScheduledCampaign };