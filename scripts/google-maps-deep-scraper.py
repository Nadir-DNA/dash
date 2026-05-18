#!/usr/bin/env python3
"""
Amens - Google Maps Deep Scraper with Clicks
Extracts phone numbers by clicking on each business card

This is SLOWER but extracts WAY MORE phone numbers:
- Without clicks: ~14% phones
- With clicks: ~60-70% phones

Time: ~2-3 sec per business = 45-60 min for Paris
Result: 600-700 phones instead of 140!

Usage:
    python3 scripts/google-maps-deep-scraper.py "coach sportif" "Paris"
"""

import asyncio
import csv
import re
from pathlib import Path
from datetime import datetime

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright not installed!")
    print("   pip3 install --break-system-packages playwright")
    exit(1)

CDP_URL = "http://127.0.0.1:9222"
OUTPUT_DIR = Path.home() / "projects" / "agentcrm" / "scraped-leads"

# City divisions
CITY_DIVISIONS = {
    'paris': [
        'Paris 1er', 'Paris 2ème', 'Paris 3ème', 'Paris 4ème', 'Paris 5ème',
        'Paris 6ème', 'Paris 7ème', 'Paris 8ème', 'Paris 9ème', 'Paris 10ème',
        'Paris 11ème', 'Paris 12ème', 'Paris 13ème', 'Paris 14ème', 'Paris 15ème',
        'Paris 16ème', 'Paris 17ème', 'Paris 18ème', 'Paris 19ème', 'Paris 20ème'
    ],
    'lyon': [
        'Lyon 1er', 'Lyon 2ème', 'Lyon 3ème', 'Lyon 4ème', 'Lyon 5ème',
        'Lyon 6ème', 'Lyon 7ème', 'Lyon 8ème', 'Lyon 9ème',
        'Villeurbanne', 'Bron', 'Vénissieux', 'Caluire'
    ],
    'marseille': [
        'Marseille 1er', 'Marseille 2ème', 'Marseille 3ème', 'Marseille 4ème',
        'Marseille 5ème', 'Marseille 6ème', 'Marseille 7ème', 'Marseille 8ème',
        'Aix-en-Provence'
    ],
    'bordeaux': [
        'Bordeaux Centre', 'Bordeaux Nord', 'Bordeaux Sud', 'Bordeaux Est', 'Bordeaux Ouest',
        'Mérignac', 'Pessac', 'Talence', 'Villenave-d\'Ornon'
    ],
}

class GoogleMapsDeepScraper:
    """Scrape Google Maps with clicks to extract phone numbers"""
    
    def __init__(self, page):
        self.page = page
        self.all_results = []
        self.seen = set()
        self.total_clicks = 0
        self.phones_found = 0
    
    async def search_and_extract(self, business_type, location):
        """Search in location and extract data WITH CLICKS"""
        
        print(f"\n   📍 Searching: {business_type} in {location}")
        
        search_url = f"https://www.google.com/maps/search/{business_type}+{location}"
        
        try:
            await self.page.goto(search_url, wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(5)
            
            # Accept cookies
            try:
                await self.page.click('button:has-text("Tout accepter"), button:has-text("Accept")', timeout=3000)
                await asyncio.sleep(2)
            except:
                pass
            
            # Wait for results
            try:
                await self.page.wait_for_selector('[role="feed"]', timeout=10000)
                await asyncio.sleep(3)
            except:
                print(f"      ⚠️  No results")
                return 0
            
            # Get list of businesses from sidebar
            businesses = await self.page.evaluate('''() => {
                const results = [];
                const feed = document.querySelector('[role="feed"]');
                if (!feed) return results;
                
                const items = feed.querySelectorAll('[role="article"]');
                items.forEach((item, i) => {
                    if (i >= 50) return;  // Limit per area
                    
                    const ariaLabel = item.getAttribute('aria-label');
                    if (!ariaLabel || ariaLabel.length < 3) return;
                    
                    // Skip UI elements
                    const skipTerms = ['menu', 'partager', 'google maps', 'page suivante', 'zoom'];
                    if (skipTerms.some(t => ariaLabel.toLowerCase().includes(t))) return;
                    
                    results.push({
                        name: ariaLabel,
                        element_index: i
                    });
                });
                
                return results;
            }''')
            
            print(f"      📋 Found {len(businesses)} businesses in list")
            
            # Click on each business to get phone number
            new_results = 0
            for i, business in enumerate(businesses, 1):
                try:
                    # Skip if already seen
                    key = f"{business['name']}_{location}"
                    if key in self.seen:
                        continue
                    
                    self.seen.add(key)
                    
                    # Click on business card
                    await self.page.evaluate(f'''() => {{
                        const feed = document.querySelector('[role="feed"]');
                        const items = feed.querySelectorAll('[role="article"]');
                        if (items[{business['element_index']}]) {{
                            items[{business['element_index']}].click();
                        }}
                    }}''')
                    
                    self.total_clicks += 1
                    
                    # Wait for side panel to open
                    await asyncio.sleep(2)
                    
                    # Extract phone from side panel
                    phone_data = await self.page.evaluate('''() => {
                        // Look for phone in side panel
                        const sidePanel = document.querySelector('div[role="main"]');
                        if (!sidePanel) return null;
                        
                        const text = sidePanel.innerText || '';
                        
                        // Extract phone with multiple patterns
                        const patterns = [
                            /0[67][\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}/,
                            /\\+33\\s?[67][\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}/,
                            /0[67]\\d{8}/,
                            /\\+33[67]\\d{8}/
                        ];
                        
                        for (const pattern of patterns) {
                            const match = text.match(pattern);
                            if (match) {
                                return match[0].replace(/[.\\-]/g, ' ');
                            }
                        }
                        
                        return null;
                    }''')
                    
                    # Go back to list
                    await self.page.evaluate('''() => {
                        const backBtn = document.querySelector('button[aria-label="Retour"], button[aria-label*="Back"]');
                        if (backBtn) backBtn.click();
                    }''')
                    await asyncio.sleep(1)
                    
                    # Store result
                    result = {
                        'name': business['name'],
                        'phone': phone_data if phone_data else '',
                        'rating': '',
                        'location': location,
                        'query': business_type
                    }
                    
                    self.all_results.append(result)
                    new_results += 1
                    
                    if phone_data:
                        self.phones_found += 1
                        if i % 10 == 0:
                            print(f"         [{i}/{len(businesses)}] {business['name'][:40]}... → 📞 {phone_data}")
                    else:
                        if i % 20 == 0:
                            print(f"         [{i}/{len(businesses)}] {business['name'][:40]}... → ❌ No phone")
                    
                except Exception as e:
                    print(f"         ⚠️  Error on {business['name'][:30]}: {str(e)[:50]}")
                    # Try to go back
                    try:
                        await self.page.evaluate('''() => {
                            const backBtn = document.querySelector('button[aria-label="Retour"]');
                            if (backBtn) backBtn.click();
                        }''')
                        await asyncio.sleep(1)
                    except:
                        pass
            
            print(f"      ✅ {location}: {new_results} new businesses, {self.phones_found} phones total")
            return new_results
            
        except Exception as e:
            print(f"      ❌ {location}: Error - {e}")
            return 0
    
    async def deep_scrape_city(self, business_type, city):
        """Deep scrape entire city"""
        
        print(f"\n🗺️  DEEP SCRAPER: {business_type} in {city}")
        print("=" * 60)
        print("⚠️  This will take 45-60 minutes (clicks on each business)")
        print("=" * 60)
        
        city_lower = city.lower()
        divisions = CITY_DIVISIONS.get(city_lower, [city])
        
        print(f"\n   📍 Searching {len(divisions)} districts...")
        
        for i, district in enumerate(divisions, 1):
            print(f"\n   [{i}/{len(divisions)}] {district}")
            await self.search_and_extract(business_type, district)
            await asyncio.sleep(2)  # Be nice to Google
        
        print("\n" + "=" * 60)
        print(f"   📊 Total: {len(self.all_results)} unique businesses")
        print(f"   📞 Phones found: {self.phones_found} ({round(self.phones_found/len(self.all_results)*100) if self.all_results else 0}%)")
        print(f"   🖱️  Total clicks: {self.total_clicks}")
        print("=" * 60)
        
        return self.all_results
    
    def save_to_csv(self, filename=None):
        """Save results to CSV"""
        
        if not filename:
            timestamp = datetime.now().strftime('%Y-%m-%d-%H%M')
            filename = f"deep-scrape-{timestamp}.csv"
        
        filepath = OUTPUT_DIR / filename
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        if not self.all_results:
            print("   ⚠️  No data to save")
            return None
        
        # Filter: Only keep leads with mobile phones (06/07)
        filtered = []
        for r in self.all_results:
            phone = r.get('phone', '')
            if phone and (phone.startswith('06') or phone.startswith('07')):
                filtered.append(r)
        
        print(f"\n   📱 After mobile filter: {len(filtered)} leads")
        
        fields = ['name', 'phone', 'rating', 'location', 'query']
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(filtered)
        
        print(f"\n✅ Saved: {filepath}")
        
        # Stats
        with_phones = len(filtered)
        with_ratings = sum(1 for r in self.all_results if r.get('rating'))
        
        print(f"📊 Total scraped: {len(self.all_results)}")
        print(f"📞 With mobile phones: {with_phones} ({round(with_phones/len(self.all_results)*100) if self.all_results else 0}%)")
        print(f"⭐ With ratings: {with_ratings}")
        
        return filepath

async def main():
    import sys
    
    print("=" * 60)
    print("🗺️  GOOGLE MAPS DEEP SCRAPER")
    print("=" * 60)
    print("Extracts phone numbers by clicking on each business")
    print("Time: ~2-3 sec per business = 45-60 min for Paris")
    print("Result: 60-70% phones instead of 14%")
    print("=" * 60)
    
    if len(sys.argv) >= 3:
        business_type = sys.argv[1]
        city = sys.argv[2]
    else:
        business_type = "coach sportif"
        city = "Paris"
        print(f"\nℹ️  Using defaults: {business_type} in {city}")
    
    try:
        async with async_playwright() as p:
            print("\n🔌 Connecting to your Chrome...")
            browser = await p.chromium.connect_over_cdp(CDP_URL, timeout=30000)
            print("✅ Connected!")
            
            # Use existing page
            contexts = browser.contexts
            if not contexts or not contexts[0].pages:
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    locale='fr-FR',
                    timezone_id='Europe/Paris'
                )
                page = await context.new_page()
            else:
                page = contexts[0].pages[0]
            
            # Create scraper
            scraper = GoogleMapsDeepScraper(page)
            
            # Deep scrape city
            results = await scraper.deep_scrape_city(business_type, city)
            
            # Save to CSV
            if results:
                filepath = scraper.save_to_csv()
                
                print("\n" + "=" * 60)
                print("✅ DEEP SCRAPER COMPLETE!")
                print("=" * 60)
                print(f"\n🚀 Next:")
                print(f"   python3 scripts/import-csv-to-agentcrm.py {filepath}")
                print(f"   python3 scripts/sms-export-pixel.py")
            
            await browser.close()
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
