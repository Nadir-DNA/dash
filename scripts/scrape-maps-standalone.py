#!/usr/bin/env python3
"""
Amens - Google Maps Scraper with YOUR Chrome
Runs OUTSIDE Hermes - Direct Playwright CDP connection

Usage:
    python3 scripts/scrape-maps-standalone.py
"""

import asyncio
import csv
import json
from pathlib import Path
from datetime import datetime

# Try to import playwright
try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright not installed!")
    print("\nInstall with:")
    print("   pip3 install playwright")
    print("   playwright install chromium")
    exit(1)

# Configuration
CDP_URL = "http://127.0.0.1:9222"
CITIES = ["Paris"]  # Test with 1 city
SEARCH_QUERIES = ["coach sportif"]
OUTPUT_DIR = Path.home() / "projects" / "agentcrm" / "scraped-leads"

async def scrape_google_maps(page, city, query):
    """Scrape Google Maps"""
    
    print(f"\n📍 Scraping: {query} in {city}")
    
    # Navigate
    search_url = f"https://www.google.com/maps/search/{query}+{city}"
    await page.goto(search_url, wait_until="domcontentloaded")
    await asyncio.sleep(5)
    
    # Accept cookies
    try:
        await page.click('button:has-text("Tout accepter"), button:has-text("Accept")', timeout=3000)
        await asyncio.sleep(2)
        print("   ✅ Cookies accepted")
    except:
        print("   ℹ️  No cookie popup")
    
    # Wait for results and debug
    print("   ⏳ Waiting for page to load...")
    await asyncio.sleep(8)
    
    # Get page HTML for debugging
    html = await page.content()
    print(f"   📄 Page length: {len(html)} chars")
    
    # Check what selectors exist
    selector_check = await page.evaluate('''() => {
        return {
            feed: document.querySelector('div[role="feed"]') ? 'FOUND' : 'NOT FOUND',
            articles: document.querySelectorAll('[role="article"]').length,
            MUxGbd: document.querySelectorAll('div.MUxGbd').length,
            hfpxzc: document.querySelectorAll('.hfpxzc').length,
            headings: document.querySelectorAll('[role="heading"]').length
        };
    }''')
    print(f"   🔍 Selectors: {selector_check}")
    
    try:
        await page.wait_for_selector('div[role="feed"]', timeout=15000)
        print("   ✅ Results loaded")
    except:
        print("   ⚠️  Feed not found, waiting more...")
        await asyncio.sleep(10)
    
    # Scroll
    await page.evaluate("window.scrollBy(0, 5000)")
    await asyncio.sleep(3)
    await page.evaluate("window.scrollBy(0, 5000)")
    await asyncio.sleep(3)
    
    # Extract ALL data like Instant Data Scraper - parse HTML not just innerText
    businesses = await page.evaluate('''() => {
        const results = [];
        
        // Get feed container
        const feed = document.querySelector('div[role="feed"]');
        if (!feed) {
            console.log('No feed found');
            return results;
        }
        
        // Get ALL business cards - use querySelectorAll on feed children
        const cards = feed.querySelectorAll('[role="article"], div[jsaction*="click"], .hfpxzc');
        console.log('Found cards:', cards.length);
        
        cards.forEach((card, i) => {
            if (i >= 30) return;
            
            // Get ALL text from this card (including hidden data)
            const allText = card.innerText || card.textContent || '';
            const lines = allText.split('\\n').filter(l => l.trim().length > 0);
            
            // Extract data from lines
            let name = '';
            let rating = '';
            let reviews = '';
            let address = '';
            let phone = '';
            
            for (let j = 0; j < lines.length && j < 10; j++) {
                const line = lines[j].trim();
                if (!line || line.length > 200) continue;
                
                // First non-empty line is usually the name
                if (!name && line.length > 3 && line.length < 100 && !line.match(/^[\d,\.]+\(/)) {
                    if (!line.toLowerCase().includes('sponsor') && !line.toLowerCase().includes('annon')) {
                        name = line;
                        continue;
                    }
                }
                
                // Rating pattern: X,X(XXX) or X.X(XXX)
                if (line.match(/^[\d,\.]+\(\d+\)$/)) {
                    rating = line;
                    continue;
                }
                
                // Phone pattern: 0X XX XX XX XX or +33 X XX XX XX XX
                if (line.match(/^[0+]?[\d\s\.]{10,}$/) && line.includes(' ')) {
                    phone = line;
                    continue;
                }
                
                // Address: usually contains street keywords
                if (!address && line.length > 10 && line.length < 150 && 
                    (line.match(/rue|avenue|boulevard|place|allée|passage|impasse/i) || 
                     line.match(/^\d+[a-z]? /i) ||
                     line.includes('Paris') || line.includes('Lyon'))) {
                    address = line;
                    continue;
                }
            }
            
            // Only add if we have a name
            if (name && name.length > 2) {
                results.push({
                    name: name,
                    rating: rating,
                    reviews: reviews,
                    address: address,
                    phone: phone
                });
                console.log('Found:', name, '| Phone:', phone || 'N/A');
            }
        });
        
        console.log('Total businesses:', results.length);
        return results;
    }''')
    
    print(f"   ✅ Found {len(businesses)} businesses")
    
    # Screenshot
    screenshot = OUTPUT_DIR / f"screenshot-{city}-{query.replace(' ', '-')}.png"
    await page.screenshot(path=str(screenshot), full_page=True)
    print(f"   📸 Screenshot: {screenshot}")
    
    return businesses

def save_to_csv(businesses, city, query):
    """Save to CSV"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    filename = f"google-maps-{city}-{query.replace(' ', '-')}.csv"
    filepath = OUTPUT_DIR / filename
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'rating', 'reviews', 'address', 'phone'])
        writer.writeheader()
        writer.writerows(businesses)
    
    print(f"   📄 Saved: {filepath}")
    return filepath

async def main():
    print("=" * 60)
    print("🗺️  AMENS - GOOGLE MAPS SCRAPER (YOUR CHROME)")
    print("=" * 60)
    print(f"CDP: {CDP_URL}")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)
    
    try:
        async with async_playwright() as p:
            # Connect to YOUR Chrome
            print("\n🔌 Connecting to your Chrome...")
            browser = await p.chromium.connect_over_cdp(CDP_URL, timeout=30000)
            print("✅ Connected!")
            
            # Always create a fresh page to avoid Chrome's search engine choice screen
            print("📄 Creating fresh page...")
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                locale='fr-FR',
                timezone_id='Europe/Paris'
            )
            page = await context.new_page()
            print(f"📄 New page created")
            
            # Scrape
            total_leads = 0
            for city in CITIES:
                for query in SEARCH_QUERIES:
                    businesses = await scrape_google_maps(page, city, query)
                    total_leads += len(businesses)
                    
                    if businesses:
                        save_to_csv(businesses, city, query)
                    
                    await asyncio.sleep(3)
            
            await browser.close()
            
            print("\n" + "=" * 60)
            print(f"✅ COMPLETE! Total leads: {total_leads}")
            print("=" * 60)
            print(f"\n📁 Files saved to: {OUTPUT_DIR}")
            print("\n🚀 Next: Import to AgentCRM")
            print(f"   python3 scripts/import-csv-to-agentcrm.py {OUTPUT_DIR}/*.csv")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
