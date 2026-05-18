#!/usr/bin/env node
/**
 * Daily Report - Envoie un résumé chaque matin
 * Run via cron: 0 11 * * * 
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COMPANY_NAME = 'sitevitrine';

async function sendReport() {
  console.log(`\n📊 === Rapport quotidien - ${new Date().toLocaleDateString('fr-FR')} ===\n`);

  try {
    // Get company ID
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('name', COMPANY_NAME)
      .single();

    if (!company) {
      console.log('❌ Entreprise non trouvée');
      return;
    }

    // Get contact stats
    const { data: contacts } = await supabase
      .from('contacts')
      .select('stage')
      .eq('company_id', company.id);

    const stats = {
      total: contacts?.length || 0,
      new: contacts?.filter(c => c.stage === 'new').length || 0,
      aContacter: contacts?.filter(c => c.stage === 'a-contacter').length || 0,
      contacted: contacts?.filter(c => c.stage === 'contacted').length || 0,
      relance: contacts?.filter(c => c.stage === 'relance').length || 0,
      interesse: contacts?.filter(c => c.stage === 'interesse').length || 0,
      qualified: contacts?.filter(c => c.stage === 'qualified').length || 0,
      converted: contacts?.filter(c => c.stage === 'converted').length || 0,
    };

    // Get today's campaign
    const today = new Date().toISOString().split('T')[0];
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('company_id', company.id)
      .ilike('name', `%${today}%`);

    const todaySent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;

    // Build message
    const message = `📊 *Rapport SiteVitrine - ${new Date().toLocaleDateString('fr-FR')}*

*Contacts:*
• Total: ${stats.total}
• À contacter: ${stats.new + stats.aContacter}
• Contactés: ${stats.contacted}
• Relance: ${stats.relance}
• Intéressés: ${stats.interesse}
• Qualifiés: ${stats.qualified}
• Clients: ${stats.converted}

*Aujourd'hui:*
• SMS envoyés: ${todaySent}

*Demain:*
• Prospects restants: ${stats.new}`;

    console.log(message);

    // Send via Brevo SMS to user
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const https = require('https');

    const sendSMS = (phone, msg) => new Promise((resolve, reject) => {
      let p = phone.replace(/[\s\-\.]/g, '');
      if (p.startsWith('0')) p = '33' + p.substring(1);
      
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
        res.on('end', () => resolve(d));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    // Send report to user
    await sendSMS('0620859362', message.replace(/\*/g, '').substring(0, 160));
    console.log('\n✅ Rapport envoyé par SMS!');

  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
}

if (require.main === module) {
  sendReport();
}

module.exports = { sendReport };