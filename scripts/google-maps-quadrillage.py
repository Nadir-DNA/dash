#!/usr/bin/env python3
"""
Amens - Google Maps Quadrillage
Scrape ALL professionals from a city by dividing it into districts/areas

Strategy:
1. Divide city into arrondissements/neighborhoods
2. Search each district separately
3. Extract data from each search
4. Combine all results + remove duplicates
5. Export master CSV

Usage:
    python3 scripts/google-maps-quadrillage.py "coach sportif" "Paris"
    python3 scripts/google-maps-quadrillage.py "restaurant" "Lyon"
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

# City quadrillage data (arrondissements, neighborhoods, districts)
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
    'toulouse': [
        'Toulouse Centre', 'Toulouse Nord', 'Toulouse Sud', 'Toulouse Est', 'Toulouse Ouest',
        'Blagnac', 'Colomiers', 'Tournefeuille'
    ],
    'nice': [
        'Nice Centre', 'Nice Nord', 'Nice Est', 'Nice Ouest',
        'Cannes', 'Antibes', 'Grasse'
    ],
    'nantes': [
        'Nantes Centre', 'Nantes Nord', 'Nantes Sud', 'Nantes Est', 'Nantes Ouest',
        'Saint-Nazaire', 'Rezé', 'Saint-Herblain'
    ],
    'lille': [
        'Lille Centre', 'Lille Nord', 'Lille Sud', 'Lille Est', 'Lille Ouest',
        'Roubaix', 'Tourcoing', 'Villeneuve-d\'Ascq'
    ]
}

class GoogleMapsQuadrillage:
    """Scrape entire city by dividing into districts"""
    
    def __init__(self, page):
        self.page = page
        self.all_results = []
        self.seen = set()
    
    async def search_and_extract(self, query, location):
        """Search for query in location and extract results"""
        
        search_url = f"https://www.google.com/maps/search/{query}+{location}"
        
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
                print(f"      ⚠️  No results for {location}")
                return 0
            
            # Extract data
            results = await self.page.evaluate('''() => {
                const results = [];
                const seen = new Set();
                
                const ariaLabels = document.querySelectorAll('*[aria-label]');
                ariaLabels.forEach(el => {
                    const name = el.getAttribute('aria-label');
                    if (!name || name.length < 3 || name.length > 150) return;
                    if (seen.has(name)) return;
                    
            // Minimal filtering - only skip obvious UI elements
            const skipTerms = ['menu', 'partager', 'google maps'];
            if (skipTerms.some(x => name.toLowerCase().includes(x))) return;
            
            // Skip if name is too short or has no letters
            if (name.length < 3) return;
            if (!/[a-zA-Zà-û]/i.test(name)) return;
                    
                    const text = el.innerText || '';
                    
                    // Extract phone - more permissive regex
                    let phone = '';
                    
                    // Try multiple patterns
                    const patterns = [
                        /0[67][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,  // 06 XX XX XX XX
                        /\+33\s?[67][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/,  // +33 6 XX...
                        /0[67]\d{8}/,  // 06XXXXXXXX
                        /\+33[67]\d{8}/  // +336XXXXXXXX
                    ];
                    
                    for (const pattern of patterns) {
                        const match = text.match(pattern);
                        if (match) {
                            phone = match[0].replace(/[.\-]/g, ' ');
                            break;
                        }
                    }
                    
                    // Extract rating
                    let rating = '';
                    const ratingMatch = text.match(/[\\d,\\.]+\\([\\d]+\\)/);
                    if (ratingMatch) rating = ratingMatch[0];
                    
                    seen.add(name);
                    results.push({ name, phone, rating });
                });
                
                function any(fn, arr) {
                    for (const item of arr) {
                        if (fn(item)) return true;
                    }
                    return false;
                }
                
                return results;
            }''')
            
            # Add location info
            for r in results:
                r['location'] = location
                r['query'] = query
            
            # Deduplicate globally
            new_results = []
            for r in results:
                key = f"{r['name']}_{location}"
                if key not in self.seen:
                    self.seen.add(key)
                    new_results.append(r)
            
            print(f"      ✅ {location}: {len(new_results)} businesses")
            self.all_results.extend(new_results)
            
            return len(new_results)
            
        except Exception as e:
            print(f"      ❌ {location}: Error - {e}")
            return 0
    
    async def quadrille_city(self, business_type, city):
        """Scrape entire city by district"""
        
        print(f"\n🗺️  Quadrillage: {business_type} in {city}")
        print("=" * 60)
        
        # Get city divisions
        city_lower = city.lower()
        divisions = CITY_DIVISIONS.get(city_lower, [city])
        
        if divisions == [city]:
            print(f"   ℹ️  No predefined divisions for {city}, searching city-wide")
        
        print(f"   📍 Searching {len(divisions)} districts/areas...")
        print()
        
        total = 0
        for i, district in enumerate(divisions, 1):
            print(f"   [{i}/{len(divisions)}] {district}")
            count = await self.search_and_extract(business_type, district)
            total += count
            await asyncio.sleep(2)  # Be nice to Google
        
        print()
        print("=" * 60)
        print(f"   📊 Total: {len(self.all_results)} unique businesses")
        print("=" * 60)
        
        return self.all_results
    
    def save_to_csv(self, filename=None, filter_mobile_only=True):
        """Save all results to CSV
        
        Args:
            filename: Output filename
            filter_mobile_only: If True, only keep French mobile numbers (06, 07)
        """
        
        if not filename:
            timestamp = datetime.now().strftime('%Y-%m-%d-%H%M')
            filename = f"quadrillage-{timestamp}.csv"
        
        filepath = OUTPUT_DIR / filename
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        if not self.all_results:
            print("   ⚠️  No data to save")
            return None
        
        # Filter: Only mobile numbers (06, 07) if requested
        if filter_mobile_only:
            filtered = []
            for r in self.all_results:
                phone = r.get('phone', '')
                if phone:
                    # Keep only 06 or 07 (French mobile)
                    if phone.startswith('06') or phone.startswith('07'):
                        filtered.append(r)
                else:
                    # Keep leads without phone (can be enriched later)
                    filtered.append(r)
            self.all_results = filtered
            print(f"   📱 After mobile filter (06/07 only): {len(self.all_results)} leads")
        
        fields = ['name', 'phone', 'rating', 'location', 'query']
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(self.all_results)
        
        print(f"\n✅ Saved: {filepath}")
        
        # Stats
        with_phones = sum(1 for r in self.all_results if r.get('phone'))
        with_mobile = sum(1 for r in self.all_results if r.get('phone', '').startswith(('06', '07')))
        with_ratings = sum(1 for r in self.all_results if r.get('rating'))
        
        print(f"📊 Total: {len(self.all_results)} businesses")
        print(f"📞 With phones: {with_phones} ({round(with_phones/len(self.all_results)*100)}%)")
        print(f"📱 With mobile (06/07): {with_mobile} ({round(with_mobile/len(self.all_results)*100)}%)")
        print(f"⭐ With ratings: {with_ratings} ({round(with_ratings/len(self.all_results)*100)}%)")
        
        # By location
        by_location = {}
        for r in self.all_results:
            loc = r.get('location', 'Unknown')
            by_location[loc] = by_location.get(loc, 0) + 1
        
        print(f"\n📍 By location:")
        for loc, count in sorted(by_location.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"   {loc}: {count}")
        
        return filepath

async def main():
    import sys
    
    print("=" * 60)
    print("🗺️  GOOGLE MAPS QUADRILLAGE")
    print("=" * 60)
    print("Scrape ALL professionals from a city by district")
    print("=" * 60)
    
    # Get parameters
    if len(sys.argv) >= 3:
        business_type = sys.argv[1]
        city = sys.argv[2]
    else:
        business_type = "coach sportif"
        city = "Paris"
        print(f"\nℹ️  Using defaults: {business_type} in {city}")
        print(f"   Usage: python3 scripts/google-maps-quadrillage.py \"coach sportif\" \"Paris\"")
    
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
            scraper = GoogleMapsQuadrillage(page)
            
            # Quadrille the city
            results = await scraper.quadrille_city(business_type, city)
            
            # Save to CSV
            if results:
                filename = f"quadrillage-{business_type.replace(' ', '-')}-{city.replace(' ', '-').lower()}.csv"
                scraper.save_to_csv(filename)
                
                print("\n" + "=" * 60)
                print("✅ QUADRILLAGE COMPLETE!")
                print("=" * 60)
                print(f"\n🚀 Next:")
                print(f"   python3 scripts/import-csv-to-agentcrm.py {OUTPUT_DIR}/{filename}")
                print(f"   python3 scripts/sms-outreach.py")
            
            await browser.close()
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
