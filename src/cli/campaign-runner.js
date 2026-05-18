#!/usr/bin/env node
/**
 * AgentCRM Campaign Runner - Style Lemlist
 * 
 * Fonctionnalités:
 * - Envoi automatique quotidien
 * - Séquences (follow-ups)
 * - Limite quotidienne
 * - Statut des messages
 * 
 * Usage: node campaign-runner.js
 * Cron: 30 10 * * * 
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const https = require('https');

// Template SMS par défaut
const DEFAULT_SMS_TEMPLATE = `Bonjour {{nom}}, j'ai vu que la concurrence avait pour la plupart un site web. Pour être plus efficace sur votre marché je me suis permit de vous creer un site web {{site}}. N'hesitez pas si vous souhaitez plus d'info DigitalDNA 0620859362 contact@thedigitaldna.fr`;

// Envoyer SMS via Brevo
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

// Extraire le site web depuis les notes
function extractWebsite(notes) {
  if (!notes) return '';
  // Chercher "Site déployé: https://..."
  const match = notes.match(/Site déployé: (https:\/\/site-vitrine-hub\.vercel\.app\/[^\s]+)/);
  if (match) return match[1];
  // Fallback: chercher n'importe quelle URL vercel
  return notes.match(/(https:\/\/site-vitrine-hub\.vercel\.app\/[^\s]+)/)?.[1] || '';
}

// Personnaliser le message
function personalize(text, contact) {
  const website = extractWebsite(contact.notes);
  console.log(`   DEBUG: contact=${contact.last_name || contact.first_name}, website=${website || 'NOT FOUND'}`);
  return text
    .replace(/{{nom}}/gi, contact.last_name || contact.first_name || 'Monsieur/Madame')
    .replace(/{{prenom}}/gi, contact.first_name || '')
    .replace(/{{entreprise}}/gi, contact.last_name || '')
    .replace(/{{site}}/gi, website || 'votre site');
}

// Runner principal
async function runCampaigns() {
  console.log(`\n🤖 === AgentCRM Campaign Runner - ${new Date().toLocaleString('fr-FR')} ===\n`);

  try {
    // 1. Trouver les campagnes actives
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .eq('channel', 'sms');

    if (campaignError) {
      console.log('❌ Erreur campaigns:', campaignError);
    }

    console.log(`📋 ${campaigns?.length || 0} campagnes actives\n`);

    for (const campaign of campaigns || []) {
      await processCampaign(campaign);
    }

    console.log('\n✅ Toutes les campagnes traitées!');

  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
}

// Traiter une campagne
async function processCampaign(campaign) {
  const companyId = campaign.company_id;
  const dailyLimit = campaign.daily_limit || 10;
  const template = campaign.body || DEFAULT_SMS_TEMPLATE;

  console.log(`\n📤 Campagne: ${campaign.name}`);
  console.log(`   Limite: ${dailyLimit}/jour`);

  // 1. Compter les messages envoyés aujourd'hui
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('sms_logs')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', today)
    .eq('campaign_id', campaign.id);

  const alreadySent = count || 0;
  const toSend = Math.max(0, dailyLimit - alreadySent);

  console.log(`   Envoyés aujourd'hui: ${alreadySent}`);
  console.log(`   À envoyer: ${toSend}`);

  if (toSend <= 0) {
    console.log(`   ⏭️  Limite atteinte, rien à envoyer`);
    return;
  }

  // 2. Récupérer les contacts à contacter (status = 'new')
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .eq('stage', 'new')
    .not('phone', 'is', null)
    .order('created_at', { ascending: true })
    .limit(toSend);

  if (!contacts?.length) {
    console.log(`   ⏭️  Plus de contacts à contacter`);
    return;
  }

  console.log(`   📱 ${contacts.length} contacts à contacter`);

  // 3. Envoyer les SMS
  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    const message = personalize(template, contact);
    
    try {
      const result = await sendSMS(contact.phone, message);
      const msgId = result.messageId ? String(result.messageId) : null;

      // Logger le message
      await supabase.from('sms_logs').insert({
        contact_id: contact.id,
        campaign_id: campaign.id,
        phone: contact.phone,
        message: message.substring(0, 160),
        brevo_id: msgId,
        status: msgId ? 'sent' : 'error',
        error: msgId ? null : 'No message ID'
      });

      // Mettre à jour le contact
      await supabase
        .from('contacts')
        .update({ stage: 'contacted', last_contacted_at: new Date().toISOString() })
        .eq('id', contact.id);

      console.log(`   ✓ ${contact.last_name}: ${contact.phone}`);
      sent++;
    } catch (e) {
      console.log(`   ✗ ${contact.last_name}: ${e.message}`);
      failed++;
    }
  }

  // 4. Mettre à jour les stats de la campagne
  await supabase
    .from('campaigns')
    .update({
      sent_count: (campaign.sent_count || 0) + sent,
      next_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('id', campaign.id);

  console.log(`   ✅ Résumé: ${sent} envoyés, ${failed} échoués`);
}

// Lancer si appelé directement
if (require.main === module) {
  runCampaigns();
}

module.exports = { runCampaigns };