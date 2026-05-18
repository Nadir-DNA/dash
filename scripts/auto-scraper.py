#!/usr/bin/env python3
"""
Amens Auto-Scraper - Google Maps Lead Extraction
Runs LOCALLY on your machine with your IP, cookies, and browser.

Usage:
    python3 scripts/auto-scraper.py
"""

import asyncio
from playwright.async_api import async_playwright
import csv
import json
import time
from pathlib import Path
from datetime import datetime

# Configuration
CITIES = ["Paris", "Lyon", "Bordeaux", "Marseille", "Lille", "Toulouse", "Nice", "Nantes"]
SEARCH_QUERIES = ["coach sportif", "personal trainer", "coach yoga", "coach pilates"]
OUTPUT_DIR = Path.home() / "projects" / "agentcrm" / "scraped-leads"
AGENTCRM_IMPORT = True  # Auto-import to AgentCRM

async def scrape_google_maps(page, city, query):
    """Scrape Google Maps for coaches in a city"""
    
    print(f"   📍 Scraping: {query} in {city}")
    
    # Navigate to Google Maps
    search_url = f"https://www.google.com/maps/search/{query}+{city}"
    await page.goto(search_url, wait_until="domcontentloaded")
    
    # Wait for page to load
    await asyncio.sleep(8)
    
    # Accept cookies if popup appears
    try:
        await page.click('button:has-text("Accepter"), button:has-text("Accept"), button:has-text("Tout accepter")', timeout=3000)
        await asyncio.sleep(2)
    except:
        pass  # No cookie popup
    
    # Close any sign-in prompts
    try:
        await page.click('button[aria-label*="Close"], button[aria-label*="Fermer"]', timeout=2000)
        await asyncio.sleep(1)
    except:
        pass
    
    # Wait for results with multiple selector attempts
    selectors = [
        'div[role="feed"]',
        'div[jsaction*="scroll"]',
        '.rsid',
        'div.MUxGbd',
        'div[class*="feed"]',
        'section[aria-label*="Results"]'
    ]
    
    found = False
    for selector in selectors:
        try:
            await page.wait_for_selector(selector, timeout=5000)
            print(f"   ✅ Found results with selector: {selector[:30]}")
            found = True
            break
        except:
            continue
    
    if not found:
        print(f"   ⚠️  Waiting more time for results...")
        await asyncio.sleep(10)
    
    # Scroll to load more results
    try:
        await page.evaluate("window.scrollBy(0, 5000)")
        await asyncio.sleep(3)
        await page.evaluate("window.scrollBy(0, 5000)")
        await asyncio.sleep(3)
    except:
        pass
    
    # Extract business information with multiple selector strategies
    leads = await page.evaluate('''() => {
        const results = [];
        
        // Find the feed container first
        const feed = document.querySelector('div[role="feed"]');
        if (!feed) {
            console.log('No feed found');
            return results;
        }
        
        // Get all direct children that look like business cards
        const children = feed.children;
        console.log('Feed children count:', children.length);
        
        for (let i = 0; i < Math.min(children.length, 20); i++) {
            const item = children[i];
            try {
                // Look for business name in various places
                let name = '';
                const heading = item.querySelector('[role="heading"]');
                if (heading) {
                    name = heading.textContent?.trim() || '';
                }
                
                // If no heading, try other selectors
                if (!name) {
                    const nameEl = item.querySelector('.hfpxzc, .DbftNf, h3, [class*="title"]');
                    if (nameEl) name = nameEl.textContent?.trim() || '';
                }
                
                // Skip if no name or too short
                if (!name || name.length < 3) continue;
                
                // Skip sponsored/results that aren't businesses
                if (name.toLowerCase().includes('ad') || name.toLowerCase().includes('sponsor')) continue;
                
                results.push({
                    name: name,
                    rating: item.querySelector('.yi40Hd')?.textContent?.trim() || '',
                    reviews: item.querySelector('[aria-label*="avis"], [aria-label*="reviews"]')?.textContent?.trim() || '',
                    address: item.querySelector('.W4Efsd')?.textContent?.trim() || '',
                    type: item.querySelector('.Zk9bK')?.textContent?.trim() || '',
                    google_maps_url: window.location.href,
                    scraped_at: new Date().toISOString()
                });
                
                console.log('Found business:', name);
            } catch (e) {
                console.log('Error processing item:', e.message);
            }
        }
        
        console.log('Total businesses found:', results.length);
        return results;
    }''')
    
    print(f"   ✅ Found {len(leads)} businesses")
    
    # Save screenshot for debugging
    screenshot_path = OUTPUT_DIR / f"screenshot-{city}-{query.replace(' ', '-')}.png"
    await page.screenshot(path=str(screenshot_path), full_page=True)
    print(f"   📸 Screenshot saved: {screenshot_path}")
    
    return leads

def save_to_csv(leads, city, query):
    """Save leads to CSV"""
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    filename = f"google-maps-{city.replace(' ', '-')}-{query.replace(' ', '-')}.csv"
    filepath = OUTPUT_DIR / filename
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['name', 'rating', 'reviews', 'address', 'type', 'phone', 'website', 'google_maps_url', 'scraped_at']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(leads)
    
    print(f"   📄 Saved: {filepath}")
    return filepath

def import_to_agentcrm(csv_file):
    """Import CSV to AgentCRM Supabase"""
    
    import requests
    import os
    from dotenv import load_dotenv
    
    env_file = Path.home() / "projects" / "agentcrm" / ".env"
    load_dotenv(env_file)
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    COMPANY_ID = "ecc147c2-8804-49c0-8881-d6b0af9e7892"
    
    if not supabase_url or not supabase_key:
        print("   ⚠️  Missing Supabase credentials - skipping import")
        return 0, 0, 0
    
    headers = {
        "apikey": supabase_key,
        "Authorization": "Bearer " + supabase_key,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    imported = 0
    duplicates = 0
    failed = 0
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            try:
                # Parse name
                name = row.get('name', '')
                name_parts = name.split()
                first_name = name_parts[0] if name_parts else ''
                last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
                
                # Extract city from address
                address = row.get('address', '')
                city = address.split(',')[-1].strip() if address else ''
                
                data = {
                    "company_id": COMPANY_ID,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": "",  # Google Maps doesn't provide emails
                    "phone": row.get('phone', ''),
                    "title": row.get('type', 'Coach'),
                    "stage": "new",
                    "source": "google_maps_auto_scraper",
                    "tags": [city, row.get('type', 'Coach')],
                    "notes": f"Address: {address} | Website: {row.get('website', '')} | Maps: {row.get('google_maps_url', '')}"
                }
                
                # Check for duplicate (by name + city)
                check_r = requests.get(
                    f"{supabase_url}/rest/v1/contacts?first_name=eq.{first_name}&last_name=eq.{last_name}&limit=1",
                    headers=headers,
                    timeout=10
                )
                
                if check_r.status_code == 200 and len(check_r.json()) > 0:
                    duplicates += 1
                    continue
                
                # Insert lead
                r = requests.post(
                    f"{supabase_url}/rest/v1/contacts",
                    headers=headers,
                    json=data,
                    timeout=10
                )
                
                if r.status_code in [200, 201]:
                    imported += 1
                    print(f"   ✅ {name} ({city})")
                else:
                    failed += 1
                    
            except Exception as e:
                failed += 1
    
    return imported, duplicates, failed

async def main():
    print("=" * 60)
    print("🗺️  AMENS AUTO-SCRAPER (Local Browser)")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Cities: {len(CITIES)}")
    print(f"Queries: {len(SEARCH_QUERIES)}")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)
    
    total_leads = 0
    total_imported = 0
    total_duplicates = 0
    total_failed = 0
    
    async with async_playwright() as p:
        # Launch browser (LOCAL - your machine, your IP)
        browser = await p.chromium.launch(
            headless=False,  # Show browser so you can see progress
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        )
        
        # Create context with realistic user agent
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='fr-FR',
            timezone_id='Europe/Paris'
        )
        
        page = await context.new_page()
        
        # Inject anti-detection script
        await page.add_init_script('''() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        }''')
        
        for city in CITIES:
            print(f"\n🏙️  City: {city}")
            
            for query in SEARCH_QUERIES:
                try:
                    leads = await scrape_google_maps(page, city, query)
                    total_leads += len(leads)
                    
                    if leads:
                        # Save to CSV
                        csv_file = save_to_csv(leads, city, query)
                        
                        # Import to AgentCRM
                        if AGENTCRM_IMPORT:
                            print("   📥 Importing to AgentCRM...")
                            imported, duplicates, failed = import_to_agentcrm(csv_file)
                            total_imported += imported
                            total_duplicates += duplicates
                            total_failed += failed
                    
                    # Rate limiting (be nice to Google)
                    await asyncio.sleep(3)
                    
                except Exception as e:
                    print(f"   ❌ Error: {e}")
        
        await browser.close()
    
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ")
    print("=" * 60)
    print(f"Total leads scraped: {total_leads}")
    print(f"Imported to AgentCRM: {total_imported}")
    print(f"Duplicates skipped: {total_duplicates}")
    print(f"Failed: {total_failed}")
    print("=" * 60)
    
    # Save summary report
    report = f"""# Google Maps Auto-Scraper Report

**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**Cities:** {', '.join(CITIES)}
**Queries:** {', '.join(SEARCH_QUERIES)}

## Results

| Metric | Count |
|--------|-------|
| Total scraped | {total_leads} |
| Imported | {total_imported} |
| Duplicates | {total_duplicates} |
| Failed | {total_failed} |

## Next Steps

1. Review leads in AgentCRM dashboard
2. Find emails (Hunter.io, manual research, or website scraping)
3. Start cold outreach campaign
4. Track conversion rate
"""
    
    report_path = OUTPUT_DIR / f"scraper-report-{datetime.now().strftime('%Y-%m-%d-%H%M')}.md"
    report_path.write_text(report)
    print(f"\n📄 Report saved: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
