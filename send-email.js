const { Resend } = require('resend');

const resend = new Resend('re_SJ2gj7LZ_Gr7M2ZMRhkSxsTG2aVta2ha1');

async function sendTestEmail() {
  console.log('Sending test email to dnadir23@gmail.com...');
  
  const result = await resend.emails.send({
    from: 'AgentCRM <onboarding@resend.dev>',
    to: 'dnadir23@gmail.com',
    subject: 'Hello - Test Email',
    html: `
      <h1>Hello!</h1>
      <p>This is a test email from AgentCRM.</p>
      <p>If you receive this, the email system is working!</p>
    `
  });
  
  console.log('Result:', result);
}

sendTestEmail().catch(console.error);