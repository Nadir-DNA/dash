#!/usr/bin/env python3
"""
Amens - Google Maps Scraper WITH Phone Numbers
Clicks each business card to extract phone numbers (like Instant Data Scraper)

Usage:
    python3 scripts/scrape-maps-with-phones.py
"""

import asyncio
import csv
from pathlib import Path
from datetime import datetime

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright not installed!")
    print("   pip3 install --break-system-packages playwright")
    print("   playwright install chromium")
    exit(1)

# Configuration
CDP_URL = "http://127.0.0.1:9222"
CITIES = ["Paris"]
SEARCH_QUERIES = ["coach sportif"]
OUTPUT_DIR = Path.home() / "projects" / "agentcrm" / "scraped-leads"

async def scrape_with_phones(page, city, query):
    """Scrape Google Maps - First get names from list, then click for phones"""
    
    print(f"\n📍 Scraping: {query} in {city}")
    print("   Phase 1: Extract names from list...")
    
    # Navigate
    search_url = f"https://www.google.com/maps/search/{query}+{city}"
    await page.goto(search_url, wait_until="domcontentloaded")
    await asyncio.sleep(5)
    
    # Accept cookies
    try:
        await page.click('button:has-text("Tout accepter"), button:has-text("Accept")', timeout=3000)
        await asyncio.sleep(3)
        print("   ✅ Cookies accepted")
    except:
        print("   ℹ️  No cookie popup")
    
    # Wait for results
    try:
        await page.wait_for_selector('div[role="feed"]', timeout=15000)
        print("   ✅ Results loaded")
    except:
        print("   ⚠️  Waiting more...")
        await asyncio.sleep(10)
    
    # PHASE 1: Get names from list (without clicking)
    businesses = await page.evaluate('''() => {
        const results = [];
        const feed = document.querySelector('div[role="feed"]');
        if (!feed) return results;
        
        const cards = feed.querySelectorAll('[role="article"]');
        cards.forEach((card, i) => {
            if (i >= 30) return;
            
            // Get name from .hfpxzc
            const nameEl = card.querySelector('.hfpxzc');
            const name = nameEl?.textContent?.trim() || '';
            
            // Get rating
            const ratingEl = card.querySelector('[aria-label*="étoiles"], .yi40Hd');
            const rating = ratingEl?.textContent?.trim() || '';
            
            if (name && name.length > 2 && !name.toLowerCase().includes('sponsor')) {
                results.push({ name, rating, address: '', phone: '' });
            }
        });
        
        return results;
    }''')
    
    print(f"   📊 Found {len(businesses)} businesses in list")
    
    if len(businesses) == 0:
        return []
    
    # PHASE 2: Click each card to get phones
    print("   Phase 2: Clicking cards for phones...")
    
    for i, business in enumerate(businesses):
        try:
            # Click on card
            await page.evaluate(f'''() => {{
                const feed = document.querySelector('div[role="feed"]');
                const cards = feed.querySelectorAll('[role="article"]');
                if (cards[{i}]) cards[{i}].click();
            }}''')
            
            await asyncio.sleep(3)
            
            # Get phone from side panel
            phone = await page.evaluate('''() => {
                const telLink = document.querySelector('a[href^="tel:"]');
                return telLink ? telLink.href.replace('tel:', '').trim() : '';
            }''')
            
            if phone:
                business['phone'] = phone
                print(f"   ✅ {i+1}. {business['name']} | 📞 {phone}")
            else:
                print(f"   ⚠️  {i+1}. {business['name']} | 📞 N/A")
            
            # Go back to list
            await page.evaluate('''() => {
                const backBtn = document.querySelector('button[aria-label="Retour"]');
                if (backBtn) backBtn.click();
            }''')
            await asyncio.sleep(2)
            
        except Exception as e:
            print(f"   ⚠️  {i+1}. Error: {e}")
            # Try to go back
            try:
                await page.evaluate('''() => {
                    const backBtn = document.querySelector('button[aria-label="Retour"]');
                    if (backBtn) backBtn.click();
                }''')
                await asyncio.sleep(2)
            except:
                pass
    
    print(f"\n   ✅ Extracted {len(businesses)} businesses")
    with_phones = sum(1 for b in businesses if b.get('phone'))
    print(f"   📞 With phones: {with_phones}/{len(businesses)}")
    
    return businesses

def save_to_csv(businesses, city, query):
    """Save to CSV"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    filename = f"google-maps-{city}-{query.replace(' ', '-')}-with-phones.csv"
    filepath = OUTPUT_DIR / filename
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['name', 'phone', 'rating', 'address'])
        writer.writeheader()
        writer.writerows(businesses)
    
    print(f"   📄 Saved: {filepath}")
    
    # Count how many have phones
    with_phones = sum(1 for b in businesses if b.get('phone'))
    print(f"   📞 Businesses with phones: {with_phones}/{len(businesses)}")
    
    return filepath

async def main():
    print("=" * 60)
    print("🗺️  AMENS - SCRAPER WITH PHONES (Like Instant Data Scraper)")
    print("=" * 60)
    print(f"CDP: {CDP_URL}")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)
    
    try:
        async with async_playwright() as p:
            print("\n🔌 Connecting to your Chrome...")
            browser = await p.chromium.connect_over_cdp(CDP_URL, timeout=30000)
            print("✅ Connected!")
            
            # Create fresh context
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                locale='fr-FR',
                timezone_id='Europe/Paris'
            )
            page = await context.new_page()
            print("📄 New page created")
            
            # Scrape
            total_leads = 0
            total_phones = 0
            
            for city in CITIES:
                for query in SEARCH_QUERIES:
                    businesses = await scrape_with_phones(page, city, query)
                    total_leads += len(businesses)
                    total_phones += sum(1 for b in businesses if b.get('phone'))
                    
                    if businesses:
                        save_to_csv(businesses, city, query)
                    
                    await asyncio.sleep(3)
            
            await browser.close()
            
            print("\n" + "=" * 60)
            print(f"✅ COMPLETE!")
            print(f"   Total leads: {total_leads}")
            print(f"   With phones: {total_phones}")
            print(f"   Phone rate: {round(total_phones/total_leads*100) if total_leads > 0 else 0}%")
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
