const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('=== AgentCRM Data Verification ===\n');
  
  // Test 1: Dashboard with sitevitrine
  console.log('1. Dashboard - sitevitrine');
  await page.goto('https://dashboard-delta-two-94.vercel.app');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Select sitevitrine
  const select = await page.$('select');
  await select.selectOption('sitevitrine');
  await page.waitForTimeout(3000);
  
  const dashboardText = await page.$eval('body', el => el.innerText);
  console.log('   Dashboard loaded:', dashboardText.includes('Dashboard') ? 'YES' : 'NO');
  console.log('   Has metrics:', dashboardText.includes('contacts') || dashboardText.includes('Total') ? 'YES' : 'NO');
  
  // Test 2: Contacts page
  console.log('\n2. Contacts page');
  await page.goto('https://dashboard-delta-two-94.vercel.app/contacts');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const contactsText = await page.$eval('body', el => el.innerText);
  console.log('   Has Nadir Daoudi:', contactsText.includes('Nadir') ? 'YES' : 'NO');
  console.log('   Has dnadir23:', contactsText.includes('dnadir23') ? 'YES' : 'NO');
  
  // Test 3: Campaigns page
  console.log('\n3. Campaigns page');
  await page.goto('https://dashboard-delta-two-94.vercel.app/campagnes');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const campaignsText = await page.$eval('body', el => el.innerText);
  console.log('   Has Prospection Email:', campaignsText.includes('Prospection Email') ? 'YES' : 'NO');
  console.log('   Has completed:', campaignsText.includes('completed') ? 'YES' : 'NO');
  console.log('   Has 1 envoyé:', campaignsText.includes('1') ? 'YES' : 'NO');
  
  // Test 4: Metrics page
  console.log('\n4. Metrics page');
  await page.goto('https://dashboard-delta-two-94.vercel.app/metrics');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const metricsText = await page.$eval('body', el => el.innerText);
  console.log('   Has metrics:', metricsText.includes('Total') || metricsText.includes('contacts') ? 'YES' : 'NO');
  
  // Test 5: Pipeline page
  console.log('\n5. Pipeline page');
  await page.goto('https://dashboard-delta-two-94.vercel.app/pipeline');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const pipelineText = await page.$eval('body', el => el.innerText);
  console.log('   Has pipeline:', pipelineText.includes('Nouveau') || pipelineText.includes('new') ? 'YES' : 'NO');
  
  console.log('\n=== Verification Complete ===\n');
  
  await page.screenshot({ path: '/home/nadir/agentcrm-verification.png', fullPage: true });
  console.log('Screenshot: /home/nadir/agentcrm-verification.png');
  
  await browser.close();
})();