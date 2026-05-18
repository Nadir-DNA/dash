#!/usr/bin/env python3
"""
Amens - Instant Scraper (Simple Version)
Works like Instant Data Scraper - extracts data from CURRENT page

Usage:
    1. Open Chrome with your target page (Google Maps, Pages Jaunes, etc.)
    2. Run: python3 scripts/instant-scraper-simple.py
    3. CSV saved automatically
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
    exit(1)

CDP_URL = "http://127.0.0.1:9222"
OUTPUT_DIR = Path.home() / "projects" / "agentcrm" / "scraped-leads"

async def main():
    print("=" * 60)
    print("🚀 INSTANT SCRAPER (Simple)")
    print("=" * 60)
    print("Extracts data from your CURRENT Chrome page")
    print("Like Instant Data Scraper extension")
    print("=" * 60)
    
    try:
        async with async_playwright() as p:
            print("\n🔌 Connecting to your Chrome...")
            browser = await p.chromium.connect_over_cdp(CDP_URL, timeout=30000)
            print("✅ Connected!")
            
            # Use existing page
            contexts = browser.contexts
            if not contexts or not contexts[0].pages:
                print("❌ No pages open in Chrome!")
                print("   Please open Google Maps or another page first")
                await browser.close()
                return
            
            page = contexts[0].pages[0]
            url = page.url
            print(f"📄 Using page: {url[:80]}")
            
            # Get page title
            title = await page.title()
            print(f"📑 Title: {title[:60]}")
            
            # Detect and extract based on URL pattern
            if 'google.com/maps' in url:
                print("\n🗺️  Detected: Google Maps")
                data = await extract_google_maps(page)
            elif 'pagesjaunes.fr' in url:
                print("\n📖 Detected: Pages Jaunes")
                data = await extract_pages_jaunes(page)
            else:
                print("\n🔍 Generic extraction...")
                data = await extract_generic(page)
            
            # Save to CSV
            if data:
                timestamp = datetime.now().strftime('%Y-%m-%d-%H%M')
                filename = f"instant-scraper-{timestamp}.csv"
                filepath = OUTPUT_DIR / filename
                
                OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
                
                if data:
                    fields = list(data[0].keys())
                    with open(filepath, 'w', newline='', encoding='utf-8') as f:
                        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
                        writer.writeheader()
                        writer.writerows(data)
                    
                    print(f"\n✅ Saved: {filepath}")
                    print(f"📊 Total items: {len(data)}")
                    
                    # Show stats
                    with_phones = sum(1 for d in data if d.get('phone'))
                    print(f"📞 With phones: {with_phones} ({round(with_phones/len(data)*100)}%)")
                    
                    print(f"\n🚀 Next:")
                    print(f"   python3 scripts/import-csv-to-agentcrm.py {filepath}")
            else:
                print("\n⚠️  No data extracted")
            
            await browser.close()
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

async def extract_google_maps(page):
    """Extract Google Maps business data"""
    print("   Extracting Google Maps data...")
    
    data = await page.evaluate('''() => {
        const results = [];
        
        // Get all articles with aria-label (business cards)
        const articles = document.querySelectorAll('article[aria-label]');
        
        articles.forEach(article => {
            const name = article.getAttribute('aria-label');
            if (!name || name.length < 3 || name.length > 150) return;
            if (name.toLowerCase().includes('sponsor') || 
                name.toLowerCase().includes('menu') ||
                name.toLowerCase().includes('partager')) return;
            
            const allText = article.innerText || '';
            
            // Extract phone
            let phone = '';
            const phoneMatch = allText.match(/[0][67][\\s\\.]?[\\d]{2}[\\s\\.]?[\\d]{2}[\\s\\.]?[\\d]{2}[\\s\\.]?[\\d]{2}/);
            if (phoneMatch) phone = phoneMatch[0].trim();
            
            const telLink = article.querySelector('a[href^="tel:"]');
            if (telLink && !phone) phone = telLink.href.replace('tel:', '').trim();
            
            // Extract website
            let website = '';
            const websiteLink = article.querySelector('a[href*="http"]');
            if (websiteLink) website = websiteLink.href;
            
            results.push({
                name: name,
                phone: phone,
                website: website,
                source: 'Google Maps'
            });
        });
        
        return results;
    }''')
    
    print(f"   ✅ Extracted {len(data)} businesses")
    return data

async def extract_pages_jaunes(page):
    """Extract Pages Jaunes data"""
    print("   Extracting Pages Jaunes data...")
    
    data = await page.evaluate('''() => {
        const results = [];
        
        // Pages Jaunes uses .result or .listing classes
        const listings = document.querySelectorAll('.result, .listing, [data-id]');
        
        listings.forEach((item, i) => {
            if (i >= 100) return;
            
            const nameEl = item.querySelector('.denomination, .business-name, h2, h3');
            const name = nameEl?.textContent?.trim() || '';
            if (!name || name.length < 3) return;
            
            const allText = item.innerText || '';
            
            // Extract phone
            let phone = '';
            const phoneMatch = allText.match(/[0][67][\\s\\.]?[\\d]{2}[\\s\\.]?[\\d]{2}[\\s\\.]?[\\d]{2}[\\s\\.]?[\\d]{2}/);
            if (phoneMatch) phone = phoneMatch[0].trim();
            
            // Extract address
            let address = '';
            const addrEl = item.querySelector('.address, .location');
            if (addrEl) address = addrEl.textContent?.trim() || '';
            
            results.push({
                name: name,
                phone: phone,
                address: address,
                source: 'Pages Jaunes'
            });
        });
        
        return results;
    }''')
    
    print(f"   ✅ Extracted {len(data)} businesses")
    return data

async def extract_generic(page):
    """Generic extraction for any page"""
    print("   Extracting generic data...")
    
    data = await page.evaluate('''() => {
        const results = [];
        
        // Look for any repetitive card-like elements
        const cards = document.querySelectorAll('[role="article"], [role="listitem"], .card, .item, .result');
        
        cards.forEach((card, i) => {
            if (i >= 100) return;
            
            const text = card.innerText?.trim() || '';
            if (text.length < 10 || text.length > 500) return;
            
            results.push({
                text_preview: text.substring(0, 200),
                source: 'Generic'
            });
        });
        
        return results;
    }''')
    
    print(f"   ✅ Extracted {len(data)} items")
    return data

if __name__ == "__main__":
    asyncio.run(main())
