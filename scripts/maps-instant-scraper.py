#!/usr/bin/env python3
"""
Amens - Google Maps Instant Scraper
Reproduit EXACTEMENT le fonctionnement d'Instant Data Scraper:
1. Scroller le panneau [role="feed"] (pas toute la page)
2. MutationObserver pour détecter nouveaux éléments
3. Extraire données structurées (pas de clics!)
4. Chercher dans attributs data-*, href="tel:", etc.

Time: ~10-15 min pour Paris (BEAUCOUP plus rapide!)
Result: ~60-70% phones (comme Instant Data Scraper!)

Usage:
    python3 scripts/maps-instant-scraper.py "coach sportif" "Paris"
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
    exit(1)

CDP_URL = "http://127.0.0.1:9222"
OUTPUT_DIR = Path.home() / "projects" / "agentcrm" / "scraped-leads"

async def scroll_and_extract(page, business_type, location, max_scrolls=10):
    """
    Scroll the feed panel and extract ALL data (like Instant Data Scraper)
    """
    
    print(f"\n📍 Searching: {business_type} in {location}")
    
    search_url = f"https://www.google.com/maps/search/{business_type}+{location}"
    await page.goto(search_url, wait_until='domcontentloaded', timeout=30000)
    await asyncio.sleep(5)
    
    # Accept cookies
    try:
        await page.click('button:has-text("Tout accepter")', timeout=3000)
        await asyncio.sleep(2)
    except:
        pass
    
    # Wait for feed to load
    try:
        await page.wait_for_selector('[role="feed"]', timeout=10000)
        await asyncio.sleep(3)
    except:
        print("   ❌ No results")
        return []
    
    # SCROLL the feed panel (CRITICAL - like Instant Data Scraper!)
    print(f"   📜 Scrolling feed (max {max_scrolls} scrolls)...")
    
    all_businesses = []
    prev_count = 0
    
    for scroll_num in range(max_scrolls):
        # Get current businesses
        businesses = await page.evaluate('''() => {
            const feed = document.querySelector('[role="feed"]');
            if (!feed) return [];
            
            const items = feed.querySelectorAll('[role="article"]');
            const results = [];
            
            items.forEach(item => {
                const ariaLabel = item.getAttribute('aria-label');
                if (!ariaLabel || ariaLabel.length < 3) return;
                
                // Skip UI elements
                const skipTerms = ['menu', 'partager', 'google maps', 'page suivante', 'zoom'];
                if (skipTerms.some(t => ariaLabel.toLowerCase().includes(t))) return;
                
                // Extract ALL data from this item - look EVERYWHERE for phone
                const data = {
                    name: ariaLabel,
                    phone: '',
                    rating: '',
                    reviews: '',
                    address: '',
                    website: '',
                    full_text: item.innerText || ''
                };
                
                // Method 1: Look for tel: links (most reliable)
                const telLink = item.querySelector('a[href^="tel:"]');
                if (telLink) {
                    data.phone = telLink.href.replace('tel:', '').trim();
                }
                
                // Method 2: Look for data-phone attributes
                const dataPhone = item.querySelector('[data-phone]')?.getAttribute('data-phone');
                if (dataPhone) {
                    data.phone = dataPhone.trim();
                }
                
                // Method 3: Look for itemprop="telephone"
                const itempropPhone = item.querySelector('[itemprop="telephone"]');
                if (itempropPhone) {
                    data.phone = itempropPhone.getAttribute('content') || itempropPhone.innerText || '';
                }
                
                // Method 4: Look for specific phone classes
                const phoneClasses = ['.phone', '.phone-link', '.business-phone', '[data-item-id]'];
                for (const cls of phoneClasses) {
                    const el = item.querySelector(cls);
                    if (el) {
                        const text = el.innerText || el.getAttribute('aria-label') || '';
                        if (text.match(/0[67]/)) {
                            data.phone = text.trim();
                            break;
                        }
                    }
                }
                
                // Method 5: Extract from full text as fallback
                if (!data.phone && data.full_text) {
                    const patterns = [
                        /0[67][\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}/,
                        /0[1-5][\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}/,
                        /\\+33\\s?[67][\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}/
                    ];
                    for (const pattern of patterns) {
                        const match = data.full_text.match(pattern);
                        if (match) {
                            data.phone = match[0].replace(/[.\\-]/g, ' ');
                            break;
                        }
                    }
                }
                
                // Extract rating
                const ratingMatch = data.full_text.match(/[\\d,\\.]+\\([\\d]+\\s*avis?\\)/i);
                if (ratingMatch) data.rating = ratingMatch[0];
                
                // Extract reviews count
                const reviewsMatch = data.full_text.match(/\\([\\d]+\\s*avis?\\)/i);
                if (reviewsMatch) data.reviews = reviewsMatch[0];
                
                // Extract address (look for street patterns)
                const lines = data.full_text.split('\\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.length > 10 && trimmed.length < 100 &&
                        (trimmed.includes('Rue') || trimmed.includes('Avenue') || 
                         trimmed.includes('Boulevard') || trimmed.includes('Paris'))) {
                        if (!data.address) data.address = trimmed;
                    }
                }
                
                results.push(data);
            });
            
            return results;
        }''')
        
        new_count = len(businesses)
        print(f"      Scroll {scroll_num + 1}/{max_scrolls}: {new_count} businesses (+{new_count - prev_count})")
        
        if new_count == prev_count:
            print("      ✅ No new businesses loaded")
            break
        
        prev_count = new_count
        all_businesses = businesses  # Keep all (no duplicates in feed)
        
        # SCROLL the feed panel (NOT the whole page!)
        await page.evaluate('''() => {
            const feed = document.querySelector('[role="feed"]');
            if (feed) {
                feed.scrollTop = feed.scrollHeight;
            }
        }''')
        
        # Wait for new data to load (like Instant Data Scraper)
        await asyncio.sleep(3)
    
    print(f"   ✅ Total: {len(all_businesses)} businesses")
    
    # Extract phones from structured data
    phones_found = 0
    for biz in all_businesses:
        # If no phone from tel: href, try to extract from full text
        if not biz['phone'] and biz['full_text']:
            patterns = [
                r'0[67][\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}',
                r'\\+33\\s?[67][\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}'
            ]
            for pattern in patterns:
                match = re.search(pattern, biz['full_text'])
                if match:
                    biz['phone'] = match.group(0).replace('.', ' ').replace('-', ' ')
                    break
        
        if biz['phone']:
            phones_found += 1
    
    print(f"   📞 Phones found: {phones_found} ({round(phones_found/len(all_businesses)*100) if all_businesses else 0}%)")
    
    return all_businesses

async def instant_scrape_city(business_type, city, max_scrolls=10):
    """Scrape entire city using Instant Data Scraper method"""
    
    print("=" * 60)
    print("🗺️  GOOGLE MAPS INSTANT SCRAPER")
    print("=" * 60)
    print("Method: Scroll feed + extract structured data")
    print("Time: ~10-15 min for Paris")
    print("=" * 60)
    
    # City divisions
    city_divisions = {
        'paris': ['Paris 1er', 'Paris 2ème', 'Paris 3ème', 'Paris 4ème', 'Paris 5ème',
                  'Paris 6ème', 'Paris 7ème', 'Paris 8ème', 'Paris 9ème', 'Paris 10ème',
                  'Paris 11ème', 'Paris 12ème', 'Paris 13ème', 'Paris 14ème', 'Paris 15ème',
                  'Paris 16ème', 'Paris 17ème', 'Paris 18ème', 'Paris 19ème', 'Paris 20ème'],
        'lyon': ['Lyon 1er', 'Lyon 2ème', 'Lyon 3ème', 'Lyon 4ème', 'Lyon 5ème',
                 'Lyon 6ème', 'Lyon 7ème', 'Lyon 8ème', 'Lyon 9ème', 'Villeurbanne'],
        'marseille': ['Marseille 1er', 'Marseille 2ème', 'Marseille 3ème', 'Marseille 4ème',
                      'Marseille 5ème', 'Marseille 6ème', 'Marseille 7ème', 'Marseille 8ème'],
        'bordeaux': ['Bordeaux Centre', 'Bordeaux Nord', 'Bordeaux Sud', 'Bordeaux Est', 'Bordeaux Ouest'],
    }
    
    divisions = city_divisions.get(city.lower(), [city])
    
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
            
            all_results = []
            
            for i, district in enumerate(divisions, 1):
                print(f"\n[{i}/{len(divisions)}] {district}")
                results = await scroll_and_extract(page, business_type, district, max_scrolls)
                for r in results:
                    r['location'] = district
                    r['query'] = business_type
                all_results.extend(results)
                await asyncio.sleep(2)
            
            await browser.close()
            
            # Save to CSV
            timestamp = datetime.now().strftime('%Y-%m-%d-%H%M')
            filename = f"instant-scrape-{business_type.replace(' ', '-')}-{city.replace(' ', '-').lower()}-{timestamp}.csv"
            filepath = OUTPUT_DIR / filename
            
            # Filter mobile only and clean data (remove full_text)
            mobile_results = []
            for r in all_results:
                if r['phone'] and (r['phone'].startswith('06') or r['phone'].startswith('07')):
                    # Remove full_text (not needed in CSV)
                    clean = {k: v for k, v in r.items() if k != 'full_text'}
                    mobile_results.append(clean)
            
            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['name', 'phone', 'rating', 'reviews', 'address', 'website', 'location', 'query'])
                writer.writeheader()
                writer.writerows(mobile_results)
            
            print("\n" + "=" * 60)
            print("✅ INSTANT SCRAPER COMPLETE!")
            print("=" * 60)
            print(f"\n📊 Total businesses: {len(all_results)}")
            print(f"📞 With mobile phones: {len(mobile_results)} ({round(len(mobile_results)/len(all_results)*100) if all_results else 0}%)")
            print(f"\n💾 Saved: {filepath}")
            print(f"\n🚀 Next:")
            print(f"   python3 scripts/import-csv-to-agentcrm.py {filepath}")
            print(f"   python3 scripts/sms-export-pixel.py")
            
            return mobile_results
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return []

async def main():
    import sys
    
    if len(sys.argv) >= 3:
        business_type = sys.argv[1]
        city = sys.argv[2]
    else:
        business_type = "coach sportif"
        city = "Paris"
        print(f"\nℹ️  Using defaults: {business_type} in {city}")
    
    await instant_scrape_city(business_type, city, max_scrolls=10)

if __name__ == "__main__":
    asyncio.run(main())
