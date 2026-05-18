#!/usr/bin/env python3
"""
Amens - Instant Data Scraper Clone
Automatically detects and extracts structured data from web pages
Works EXACTLY like Instant Data Scraper extension

Usage:
    python3 scripts/instant-scraper.py "https://www.google.com/maps/search/coach+sportif+Paris"
    python3 scripts/instant-scraper.py "https://www.pagesjaunes.fr/search..."
"""

import asyncio
import csv
import json
import re
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
OUTPUT_DIR = Path.home() / "projects" / "agentcrm" / "scraped-leads"

async def detect_data_patterns(page):
    """
    Detect repetitive data patterns on page (like Instant Data Scraper AI)
    Returns list of detected data blocks
    """
    
    print("\n🔍 Analyzing page structure...")
    
    # Analyze DOM for repetitive patterns
    patterns = await page.evaluate('''() => {
        const results = {
            cards: [],
            tables: [],
            lists: []
        };
        
        // STRATEGY 1: Find card-like elements (Google Maps, business listings)
        const cardSelectors = [
            '[role="article"]',
            'div[jsaction*="click"]',
            '.hfpxzc',
            '.MUxGbd',
            '[data-cid]',
            '.business-card',
            '.listing-card',
            '.result-card',
            '.search-result',
            '.item-card'
        ];
        
        for (const selector of cardSelectors) {
            const cards = document.querySelectorAll(selector);
            if (cards.length >= 2) {
                const sampleCards = [];
                for (let i = 0; i < Math.min(3, cards.length); i++) {
                    const card = cards[i];
                    sampleCards.push({
                        text: card.innerText?.substring(0, 200),
                        html: card.innerHTML?.substring(0, 300),
                        classes: Array.from(card.classList),
                        attributes: Array.from(card.attributes).map(a => a.name)
                    });
                }
                results.cards.push({
                    selector: selector,
                    count: cards.length,
                    sample: sampleCards
                });
            }
        }
        
        // STRATEGY 2: Find tables
        const tables = document.querySelectorAll('table');
        tables.forEach((table, i) => {
            const rows = table.querySelectorAll('tr');
            if (rows.length >= 2) {
                results.tables.push({
                    index: i,
                    rows: rows.length,
                    columns: rows[0]?.querySelectorAll('td, th')?.length || 0,
                    preview: table.innerText?.substring(0, 500)
                });
            }
        });
        
        // STRATEGY 3: Find lists (ul, ol, div lists)
        const lists = document.querySelectorAll('ul, ol, div[role="list"]');
        lists.forEach((list, i) => {
            const items = list.querySelectorAll('li, [role="listitem"]');
            if (items.length >= 3) {
                results.lists.push({
                    index: i,
                    tag: list.tagName,
                    items: items.length,
                    preview: list.innerText?.substring(0, 300)
                });
            }
        });
        
        return results;
    }''')
    
    # Analyze results
    print(f"   📊 Cards found: {len(patterns['cards'])} patterns")
    print(f"   📊 Tables found: {len(patterns['tables'])}")
    print(f"   📊 Lists found: {len(patterns['lists'])}")
    
    # Choose best pattern
    best_pattern = None
    if patterns['cards']:
        # Pick card pattern with most items
        best_pattern = max(patterns['cards'], key=lambda x: x['count'])
        print(f"   ✅ Best pattern: {best_pattern['selector']} ({best_pattern['count']} items)")
    
    return best_pattern, patterns

async def extract_card_data(page, pattern):
    """Extract all data from detected card pattern"""
    
    print(f"\n📦 Extracting data from {pattern['selector']}...")
    
    # Use article elements which contain all the data
    data = await page.evaluate('''() => {
        const results = [];
        
        // Get ALL articles, then filter by aria-label
        const allArticles = document.querySelectorAll('article');
        
        allArticles.forEach((article, i) => {
            if (i >= 100) return;
            
            const name = article.getAttribute('aria-label');
            if (!name || name.length < 3 || name.length > 150) return;
            if (name.toLowerCase().includes('sponsor') || 
                name.toLowerCase().includes('annon') ||
                name.toLowerCase().includes('résultats') ||
                name.toLowerCase().includes('menu') ||
                name.toLowerCase().includes('partager')) return;
            
            // Get all text from article
            const allText = article.innerText || '';
            
            // Extract phone (look for phone pattern in text)
            let phone = '';
            const phoneMatch = allText.match(/[0][67][\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}/);
            if (phoneMatch) {
                phone = phoneMatch[0].trim();
            }
            
            // Check for tel: link
            const telLink = article.querySelector('a[href^="tel:"]');
            if (telLink && !phone) {
                phone = telLink.href.replace('tel:', '').trim();
            }
            
            // Extract website
            let website = '';
            const websiteLink = article.querySelector('a[href*="http"]');
            if (websiteLink) {
                website = websiteLink.href;
            }
            
            results.push({
                name: name,
                phone: phone,
                website: website,
                text_preview: allText.substring(0, 200)
            });
            
            console.log('Found:', name, '| Phone:', phone || 'N/A');
        });
        
        return results;
    }''')
    
    print(f"   ✅ Extracted {len(data)} items")
    return data

async def extract_table_data(page, table_info):
    """Extract data from HTML table"""
    
    print(f"\n📦 Extracting data from table...")
    
    data = await page.evaluate('''() => {
        const results = [];
        const tables = document.querySelectorAll('table');
        
        tables.forEach((table, ti) => {
            const rows = table.querySelectorAll('tr');
            const headers = [];
            
            // Get headers from first row
            const headerCells = rows[0]?.querySelectorAll('th');
            if (headerCells) {
                headerCells.forEach((th, i) => {
                    headers[i] = th.textContent?.trim() || `Column ${i}`;
                });
            }
            
            // Get data from remaining rows
            for (let ri = headerCells ? 1 : 0; ri < rows.length; ri++) {
                const row = rows[ri];
                const cells = row.querySelectorAll('td');
                const item = {};
                
                cells.forEach((td, ci) => {
                    const key = headers[ci] || `column_${ci}`;
                    item[key] = td.textContent?.trim() || '';
                });
                
                if (Object.keys(item).length > 0) {
                    results.push(item);
                }
            }
        });
        
        return results;
    }''')
    
    print(f"   ✅ Extracted {len(data)} rows")
    return data

def save_to_csv(data, url):
    """Save extracted data to CSV"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Generate filename from URL
    timestamp = datetime.now().strftime('%Y-%m-%d-%H%M')
    filename = f"instant-scraper-{timestamp}.csv"
    filepath = OUTPUT_DIR / filename
    
    if not data:
        print("   ⚠️  No data to save")
        return None
    
    # Get all field names
    all_fields = set()
    for item in data:
        all_fields.update(item.keys())
    
    # Remove internal fields
    all_fields.discard('_index')
    all_fields.discard('all_text')
    
    # Prioritize common fields
    priority_fields = ['name', 'phone', 'rating', 'reviews', 'address', 'website', 'email']
    fields = [f for f in priority_fields if f in all_fields]
    fields.extend([f for f in all_fields if f not in fields])
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(data)
    
    print(f"   📄 Saved: {filepath}")
    
    # Show stats
    with_phones = sum(1 for d in data if d.get('phone'))
    with_ratings = sum(1 for d in data if d.get('rating'))
    with_addresses = sum(1 for d in data if d.get('address'))
    
    print(f"\n   📊 Stats:")
    print(f"      Total items: {len(data)}")
    print(f"      With phones: {with_phones} ({round(with_phones/len(data)*100)}%)")
    print(f"      With ratings: {with_ratings} ({round(with_ratings/len(data)*100)}%)")
    print(f"      With addresses: {with_addresses} ({round(with_addresses/len(data)*100)}%)")
    
    return filepath

async def main():
    print("=" * 60)
    print("🚀 INSTANT DATA SCRAPER CLONE")
    print("=" * 60)
    print("Automatically detects and extracts structured data")
    print("Works like Instant Data Scraper Chrome extension")
    print("=" * 60)
    
    # Get URL from command line or use default
    import sys
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = "https://www.google.com/maps/search/coach+sportif+Paris"
    
    print(f"\n🌐 Target URL: {url}")
    
    try:
        async with async_playwright() as p:
            # Connect to existing Chrome (with user's cookies/session)
            print("\n🔌 Connecting to your Chrome...")
            browser = await p.chromium.connect_over_cdp(CDP_URL, timeout=30000)
            print("✅ Connected!")
            
            # Use existing page if available, otherwise create new one
            contexts = browser.contexts
            if contexts and contexts[0].pages:
                page = contexts[0].pages[0]
                print("📄 Using existing page")
            else:
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    locale='fr-FR',
                    timezone_id='Europe/Paris'
                )
                page = await context.new_page()
                print("📄 New page created")
                
                # Navigate to target URL
                print(f"\n🌐 Navigating to {url[:80]}...")
                await page.goto(url, wait_until='domcontentloaded', timeout=60000)
                await asyncio.sleep(8)  # Wait for dynamic content
            
            # Accept cookies if popup
            try:
                await page.click('button:has-text("Tout accepter"), button:has-text("Accept"), button:has-text("OK")', timeout=3000)
                print("   ✅ Cookies accepted")
                await asyncio.sleep(2)
            except:
                print("   ℹ️  No cookie popup")
            
            # Detect data patterns
            best_pattern, all_patterns = await detect_data_patterns(page)
            
            if not best_pattern:
                print("\n❌ Could not detect structured data on this page")
                print("\n💡 Tips:")
                print("   - Make sure the page has a list/table of items")
                print("   - Try scrolling to load more content")
                print("   - Try Instant Data Scraper Chrome extension instead")
                await browser.close()
                return
            
            # Extract data
            if best_pattern:
                data = await extract_card_data(page, best_pattern)
            
            # Save to CSV
            if data:
                filepath = save_to_csv(data, url)
                
                print("\n" + "=" * 60)
                print("✅ EXTRACTION COMPLETE!")
                print("=" * 60)
                print(f"\n📁 File: {filepath}")
                print("\n🚀 Next steps:")
                print("   1. Import to AgentCRM:")
                print(f"      python3 scripts/import-csv-to-agentcrm.py {filepath}")
                print("   2. Send SMS:")
                print("      python3 scripts/sms-outreach.py")
            else:
                print("\n⚠️  No data extracted")
            
            await browser.close()
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
