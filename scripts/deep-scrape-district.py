#!/usr/bin/env python3
"""
Amens - Google Maps Deep Scraper (Single District)
Extracts phone numbers by clicking on each business in ONE district

Time: ~2-3 min per arrondissement
Result: 60-70% phones instead of 14%

Usage:
    python3 scripts/deep-scrape-district.py "coach sportif" "Paris 1er"
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

async def deep_scrape_district(business_type, district):
    """Deep scrape ONE district"""
    
    print(f"\n🗺️  DEEP SCRAPER: {business_type} in {district}")
    print("=" * 60)
    print("⏱️  Estimated time: 2-3 minutes")
    print("=" * 60)
    
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
            
            # Navigate
            search_url = f"https://www.google.com/maps/search/{business_type}+{district}"
            print(f"\n📍 Searching: {search_url}")
            
            await page.goto(search_url, wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(5)
            
            # Accept cookies
            try:
                await page.click('button:has-text("Tout accepter")', timeout=3000)
                await asyncio.sleep(2)
            except:
                pass
            
            # Wait for results
            try:
                await page.wait_for_selector('[role="feed"]', timeout=10000)
                await asyncio.sleep(3)
                
                # SCROLL the feed to load MORE businesses (critical!)
                await page.evaluate('''() => {
                    const feed = document.querySelector('[role="feed"]');
                    if (feed) {
                        for (let i = 0; i < 5; i++) {
                            feed.scrollTop = feed.scrollHeight;
                        }
                    }
                }''')
                await asyncio.sleep(3)
                
                # Scroll back to top
                await page.evaluate('''() => {
                    const feed = document.querySelector('[role="feed"]');
                    if (feed) feed.scrollTop = 0;
                }''')
                await asyncio.sleep(1)
                
            except:
                print("❌ No results found")
                await browser.close()
                return []
            
            # Get list of businesses (after scrolling)
            businesses = await page.evaluate('''() => {
                const results = [];
                const feed = document.querySelector('[role="feed"]');
                if (!feed) return results;
                
                const items = feed.querySelectorAll('[role="article"]');
                items.forEach((item, i) => {
                    if (i >= 50) return;
                    
                    const ariaLabel = item.getAttribute('aria-label');
                    if (!ariaLabel || ariaLabel.length < 3) return;
                    
                    const skipTerms = ['menu', 'partager', 'google maps', 'page suivante', 'zoom'];
                    if (skipTerms.some(t => ariaLabel.toLowerCase().includes(t))) return;
                    
                    results.push({
                        name: ariaLabel,
                        element_index: i
                    });
                });
                
                return results;
            }''')
            
            print(f"\n📋 Found {len(businesses)} businesses in list")
            print(f"⏱️  Estimated time: {len(businesses) * 2.5 / 60:.1f} minutes\n")
            
            # Click on each business
            results = []
            phones_found = 0
            
            for i, business in enumerate(businesses, 1):
                try:
                    # Get fresh list and click by name (more reliable)
                    await page.evaluate(f'''() => {{
                        const feed = document.querySelector('[role="feed"]');
                        if (!feed) return;
                        const items = feed.querySelectorAll('[role="article"]');
                        
                        // Find item by aria-label
                        for (const item of items) {{
                            const label = item.getAttribute('aria-label');
                            if (label && label.includes("{business['name'][:30]}")) {{
                                item.click();
                                break;
                            }}
                        }}
                    }}''')
                    
                    # Wait for side panel to fully load
                    await asyncio.sleep(3)
                    
                    # Scroll the side panel to reveal all content (including phone)
                    await page.evaluate('''() => {
                        const panel = document.querySelector('div[role="main"]');
                        if (panel) {
                            panel.scrollTop = 0;
                            setTimeout(() => { panel.scrollTop = panel.scrollHeight; }, 100);
                            setTimeout(() => { panel.scrollTop = 0; }, 200);
                        }
                    }''')
                    await asyncio.sleep(1)
                    
                    # Extract phone - Look for the ACTUAL phone button/link
                    phone_data = await page.evaluate('''() => {
                        // Method 1: Find the "Call" or "Appeler" button (most reliable)
                        const callButtons = document.querySelectorAll('button');
                        for (const btn of callButtons) {
                            const text = btn.innerText || btn.getAttribute('aria-label') || '';
                            if (text.toLowerCase().includes('appeler') || text.toLowerCase().includes('call')) {
                                // Extract phone from button data or nearby text
                                const phoneHref = btn.closest('a')?.href;
                                if (phoneHref && phoneHref.includes('tel:')) {
                                    return phoneHref.replace('tel:', '').trim();
                                }
                            }
                        }
                        
                        // Method 2: Find tel: links directly
                        const telLinks = document.querySelectorAll('a[href^="tel:"]');
                        if (telLinks.length > 0) {
                            return telLinks[0].href.replace('tel:', '').trim();
                        }
                        
                        // Method 3: Look for phone in structured data
                        const mainPanel = document.querySelector('div[role="main"]');
                        if (mainPanel) {
                            // Look for specific phone patterns in the panel
                            const text = mainPanel.innerText || '';
                            const lines = text.split('\\n');
                            
                            // Find line after "Téléphone" or "Contact" label
                            for (let i = 0; i < lines.length - 1; i++) {
                                const line = lines[i].toLowerCase();
                                if (line.includes('téléphone') || line.includes('contact') || line.includes('appeler')) {
                                    const nextLine = lines[i + 1].trim();
                                    const patterns = [
                                        /0[67][\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}/,
                                        /\\+33\\s?[67][\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}/
                                    ];
                                    for (const pattern of patterns) {
                                        const match = nextLine.match(pattern);
                                        if (match) {
                                            return match[0].replace(/[.\\-]/g, ' ');
                                        }
                                    }
                                }
                            }
                        }
                        
                        return null;
                    }''')
                    
                    # Go back
                    await page.evaluate('''() => {
                        const backBtn = document.querySelector('button[aria-label="Retour"]');
                        if (backBtn) backBtn.click();
                    }''')
                    await asyncio.sleep(1)
                    
                    # Store result
                    result = {
                        'name': business['name'],
                        'phone': phone_data if phone_data else '',
                        'rating': '',
                        'location': district,
                        'query': business_type
                    }
                    
                    results.append(result)
                    
                    if phone_data:
                        phones_found += 1
                        print(f"   [{i}/{len(businesses)}] ✅ {business['name'][:35]:35} → 📞 {phone_data}")
                    else:
                        print(f"   [{i}/{len(businesses)}] ❌ {business['name'][:35]:35} → No phone")
                    
                except Exception as e:
                    print(f"   [{i}/{len(businesses)}] ⚠️  Error: {str(e)[:40]}")
                    try:
                        await page.evaluate('''() => {
                            const backBtn = document.querySelector('button[aria-label="Retour"]');
                            if (backBtn) backBtn.click();
                        }''')
                        await asyncio.sleep(1)
                    except:
                        pass
            
            await browser.close()
            
            # Save to CSV
            timestamp = datetime.now().strftime('%Y-%m-%d-%H%M')
            safe_district = district.replace(' ', '-').replace('è', 'e').replace('é', 'e').replace('ê', 'e')
            filename = f"deep-scrape-{business_type.replace(' ', '-')}-{safe_district}-{timestamp}.csv"
            filepath = OUTPUT_DIR / filename
            
            # Filter mobile only
            mobile_results = [r for r in results if r['phone'] and (r['phone'].startswith('06') or r['phone'].startswith('07'))]
            
            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['name', 'phone', 'rating', 'location', 'query'])
                writer.writeheader()
                writer.writerows(mobile_results)
            
            print("\n" + "=" * 60)
            print(f"✅ {district} COMPLETE!")
            print("=" * 60)
            print(f"\n📊 Total businesses: {len(results)}")
            print(f"📞 With mobile phones: {len(mobile_results)} ({round(len(mobile_results)/len(results)*100) if results else 0}%)")
            print(f"\n💾 Saved: {filepath}")
            print(f"\n🚀 Next district:")
            print(f"   python3 scripts/deep-scrape-district.py \"{business_type}\" \"Paris 2ème\"")
            
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
        district = sys.argv[2]
    else:
        business_type = "coach sportif"
        district = "Paris 1er"
        print(f"\nℹ️  Using defaults: {business_type} in {district}")
    
    await deep_scrape_district(business_type, district)

if __name__ == "__main__":
    asyncio.run(main())
