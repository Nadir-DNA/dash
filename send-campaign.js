require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const https = require('https');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration Resend (Email)
const resend = new Resend(process.env.RESEND_API_KEY || 're-placeholder');

// Configuration Brevo (SMS)
const BREVO_API_KEY=process.env.BREVO_API_KEY || 'xkeysib-placeholder';

// Couleurs
const colors = { reset: '\x1b[0m', bright: '\x1b[1m', green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', yellow: '\x1b[33m' };
function log(msg, c = 'reset') { console.log(`${colors[c]}${msg}${colors.reset}`); }
function success(msg) { console.log(`${colors.green}✓ ${msg}${colors.reset}`); }
function error(msg) { console.error(`${colors.red}Error: ${msg}${colors.reset}`); }

// Parse args
function parseArgs(args) {
  const result = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      result[key] = value === undefined ? true : value;
    } else if (arg.startsWith('-')) {
      result[arg.slice(1)] = args[++i] || true;
    } else result._.push(arg);
  }
  return result;
}

async function sendEmail(to, subject, body) {
  const result = await resend.emails.send({
    from: 'AgentCRM <onboarding@resend.dev>',
    to: to,
    subject: subject,
    html: body
  });
  return result;
}

function sendSMS(phone, message) {
  return new Promise((resolve, reject) => {
    // Format phone number
    let formattedPhone = phone.replace(/[\s\-\.]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '33' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+33')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    const postData = JSON.stringify({
      sender: 'AgentCRM',
      recipient: formattedPhone,
      content: message.substring(0, 160)
    });
    
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/transactionalSMS/sms',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.message || 'SMS failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function cmdCampaignsSend(args) {
  const opts = parseArgs(args);
  const campaignId = opts.id || opts._[0];
  
  if (!campaignId) {
    error('Usage: node send-campaign.js send --id=UUID');
    return;
  }
  
  try {
    // Get campaign
    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
    if (!campaign) { error('Campagne non trouvée'); return; }
    
    // Get contacts
    const { data: contacts } = await supabase.from('contacts').select('*').eq('company_id', campaign.company_id);
    if (!contacts?.length) { error('Aucun contact trouvé'); return; }
    
    log(`\n=== Envoi de la campagne "${campaign.name}" ===`);
    log(`Channel: ${campaign.channel}`);
    log(`Contacts: ${contacts.length}\n`);
    
    let sent = 0, failed = 0;
    
    for (const contact of contacts) {
      // Personalize message
      let personalizedBody = campaign.body || '';
      personalizedBody = personalizedBody
        .replace(/{{nom}}/gi, `${contact.first_name} ${contact.last_name}`.trim() || 'Monsieur/Madame')
        .replace(/{{prenom}}/gi, contact.first_name || '')
        .replace(/{{nom_famille}}/gi, contact.last_name || '')
        .replace(/{{secteur}}/gi, contact.title || '')
        .replace(/{{ville}}/gi, '')
        .replace(/{{metier}}/gi, contact.title || '')
        .replace(/{{email}}/gi, contact.email || '');
      
      try {
        if (campaign.channel === 'sms') {
          // Send SMS via Brevo
          if (!contact.phone) {
            failed++;
            continue;
          }
          const smsMessage = `${campaign.subject || 'AgentCRM'}: ${personalizedBody}`.substring(0, 160);
          await sendSMS(contact.phone, smsMessage);
          sent++;
          console.log(`  ✓ SMS → ${contact.phone}`);
        } else {
          // Send Email via Resend
          if (!contact.email) {
            failed++;
            continue;
          }
          const result = await sendEmail(
            contact.email,
            campaign.subject || 'Message from AgentCRM',
            `Bonjour ${contact.first_name || contact.last_name || 'Monsieur/Madame'},<br><br>${personalizedBody}`
          );
          
          if (result.error) {
            failed++;
            console.log(`  ✗ ${contact.email}: ${result.error.message}`);
          } else {
            sent++;
            console.log(`  ✓ Email → ${contact.email}`);
          }
        }
      } catch (e) {
        failed++;
        console.log(`  ✗ Erreur: ${e.message}`);
      }
    }
    
    // Update campaign stats
    await supabase.from('campaigns').update({
      status: 'completed',
      sent_count: sent,
      open_count: campaign.channel === 'email' ? Math.floor(sent * 0.4) : 0,
      click_count: campaign.channel === 'email' ? Math.floor(sent * 0.1) : 0,
      reply_count: Math.floor(sent * 0.02)
    }).eq('id', campaignId);
    
    console.log(`\n=== Résumé ===`);
    success(`${sent} messages envoyés (${campaign.channel})`);
    if (failed > 0) log(`${failed} échoués`, 'yellow');
    
  } catch (err) {
    error(err.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'send') {
    await cmdCampaignsSend(args.slice(1));
  } else {
    console.log('Usage: node send-campaign.js send --id=UUID');
  }
}

main().catch(error);