const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('=== Testing AgentCRM Website - Amens Test ===\n');
  
  // Go to the dashboard
  await page.goto('https://dashboard-delta-two-94.vercel.app');
  await page.waitForLoadState('networkidle');
  
  // Wait for the page to load
  await page.waitForTimeout(3000);
  
  // Select Amens Test from the dropdown
  const select = await page.$('select');
  if (select) {
    await select.selectOption('Amens Test');
    console.log('Selected: Amens Test');
    
    // Wait for the page to reload
    await page.waitForTimeout(3000);
  }
  
  // Now navigate to contacts page
  await page.goto('https://dashboard-delta-two-94.vercel.app/contacts');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Check for contacts table
  const table = await page.$('table');
  if (table) {
    console.log('✓ Contacts table found');
    
    // Get contacts
    const rows = await page.$$eval('table tbody tr', rows => 
      rows.map(row => row.textContent)
    );
    console.log('Contacts found:', rows.length);
    console.log('\nFirst few contacts:');
    rows.slice(0, 10).forEach(r => console.log('  -', r.substring(0, 100)));
  } else {
    console.log('✗ No contacts table found');
    
    // Check for any content
    const bodyText = await page.$eval('body', el => el.innerText);
    console.log('\nPage content preview:');
    console.log(bodyText.substring(0, 800));
  }
  
  // Take screenshot
  await page.screenshot({ path: '/home/nadir/agentcrm-amens-test.png', fullPage: true });
  console.log('\nScreenshot saved to /home/nadir/agentcrm-amens-test.png');
  
  await browser.close();
})();