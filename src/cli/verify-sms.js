#!/usr/bin/env node
/**
 * SMS Verification - Vérifie le statut de livraison des SMS
 * Run: node src/cli/verify-sms.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const https = require('https');

async function checkDeliveryStatus(brevoId) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: `/v3/transactionalSMS/sms/${brevoId}`,
      method: 'GET',
      headers: { 'api-key': BREVO_API_KEY }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve({ error: e.message }); }
      });
    });
    req.on('error', () => resolve({ error: 'Network error' }));
    req.end();
  });
}

async function verifySMS() {
  console.log(`\n🔍 === Vérification SMS - ${new Date().toLocaleString('fr-FR')} ===\n`);

  try {
    // Get company ID
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('name', 'sitevitrine')
      .single();

    // Get today's SMS logs
    const today = new Date().toISOString().split('T')[0];
    
    const { data: logs, error } = await supabase
      .from('sms_logs')
      .select('*')
      .gte('sent_at', today)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    console.log(`📋 ${logs?.length || 0} SMS envoyés aujourd'hui\n`);

    let delivered = 0;
    let pending = 0;
    let errors = [];
    const toCheck = [];

    for (const log of logs || []) {
      if (log.status === 'error') {
        errors.push(log);
      } else if (log.brevo_id && log.status !== 'delivered') {
        toCheck.push(log);
      } else if (log.status === 'delivered') {
        delivered++;
      } else {
        pending++;
      }
    }

    // Check delivery status for each SMS
    console.log('🔄 Vérification du statut...\n');
    
    for (const log of toCheck) {
      try {
        const status = await checkDeliveryStatus(log.brevo_id);
        
        let newStatus = log.status;
        if (status.status === 'delivered') {
          newStatus = 'delivered';
          delivered++;
        } else if (status.status === 'failed' || status.status === 'rejected') {
          newStatus = 'failed';
          errors.push({ ...log, error: status.status });
        }

        // Update in DB
        await supabase
          .from('sms_logs')
          .update({ 
            status: newStatus,
            delivered_at: newStatus === 'delivered' ? new Date().toISOString() : null
          })
          .eq('id', log.id);

        console.log(`  ${log.phone}: ${newStatus}`);
      } catch (e) {
        console.log(`  ${log.phone}: erreur vérification - ${e.message}`);
      }
    }

    // Build report
    console.log('\n=== RAPPORT ===');
    console.log(`✅ Délivrés: ${delivered}`);
    console.log(`⏳ En attente: ${pending}`);
    console.log(`❌ Erreurs: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERREURS:');
      errors.forEach(e => {
        console.log(`  • ${e.phone}: ${e.error}`);
      });
    }

    // Save report to database for dashboard
    const reportData = {
      date: today,
      total: logs?.length || 0,
      delivered,
      pending,
      errors: errors.length,
      error_details: errors.map(e => ({ phone: e.phone, error: e.error }))
    };

    await supabase.from('campaign_reports').insert({
      company_id: company.id,
      report_date: today,
      report_type: 'sms_verification',
      total_sent: logs?.length || 0,
      total_delivered: delivered,
      total_pending: pending,
      total_errors: errors.length,
      details: JSON.stringify(reportData)
    });

    console.log('\n✅ Rapport sauvegardé dans AgentCRM!');

  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
}

if (require.main === module) {
  verifySMS();
}

module.exports = { verifySMS };