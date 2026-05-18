
import asyncio
from playwright.async_api import async_playwright

async def test_chrome():
    print("\n🔌 Connecting to your Chrome via CDP (port 9222)...")
    
    try:
        async with async_playwright() as p:
            # Connect to existing Chrome instance
            browser = await p.chromium.connect_over_cdp(
                "http://127.0.0.1:9222",
                timeout=30000
            )
            
            print("✅ Connected to YOUR Chrome!")
            
            # Get the first page or create new one
            contexts = browser.contexts
            if contexts:
                page = contexts[0].pages[0] if contexts[0].pages else await contexts[0].new_page()
            else:
                page = await browser.new_page()
            
            print("📄 Navigating to Google Maps...")
            await page.goto("https://www.google.com/maps/search/coach+sportif+Paris", wait_until="domcontentloaded")
            await asyncio.sleep(5)
            
            # Take screenshot
            screenshot_path = "/home/nadir/projects/agentcrm/scraped-leads/test-chrome-connection.png"
            await page.screenshot(path=screenshot_path, full_page=True)
            print(f"📸 Screenshot saved: {screenshot_path}")
            
            # Get page title
            title = await page.title()
            print(f"📄 Page title: {title}")
            
            # Try to find businesses
            businesses = await page.evaluate('''() => {
                const results = [];
                const feed = document.querySelector('div[role="feed"]');
                if (!feed) return results;
                
                const items = feed.querySelectorAll('[role="article"]');
                console.log('Items found:', items.length);
                
                items.forEach(item => {
                    const name = item.querySelector('[role="heading"]')?.textContent?.trim();
                    if (name) results.push(name);
                });
                
                return results;
            }''')
            
            print(f"🏢 Businesses found: {len(businesses)}")
            for b in businesses[:5]:
                print(f"   - {b}")
            
            await browser.close()
            print("\n✅ Test completed successfully!")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")

asyncio.run(test_chrome())
