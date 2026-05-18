#!/usr/bin/env python3
"""
Amens - Instant Scraper PRO
EXACTEMENT comme Instant Data Scraper extension

Detecte automatiquement les données structurées et les extrait.

Usage:
    1. Ouvre ta page dans Chrome (Google Maps, Pages Jaunes, etc.)
    2. python3 scripts/instant-scraper-pro.py
    3. CSV généré automatiquement
"""

import asyncio
import csv
import re
import json
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

async def get_page_structure(page):
    """Get complete page structure using multiple methods"""
    
    # Method 1: Get feed content (this WORKS based on browser_snapshot)
    feed_content = await page.evaluate('''() => {
        const feed = document.querySelector('[role="feed"]');
        if (!feed) return '';
        
        // Get ALL text from feed
        return feed.innerText;
    }''')
    
    # Method 2: Get all aria-labels from articles
    aria_labels = await page.evaluate('''() => {
        const results = [];
        const allElements = document.querySelectorAll('*[aria-label]');
        
        allElements.forEach(el => {
            const label = el.getAttribute('aria-label');
            if (label && label.length > 3 && label.length < 150) {
                results.push({
                    label: label,
                    tag: el.tagName,
                    text: el.innerText?.substring(0, 300) || ''
                });
            }
        });
        
        return results;
    }''')
    
    # Method 3: Get all elements with business-like data
    business_cards = await page.evaluate('''() => {
        const results = [];
        
        // Try multiple selectors
        const selectors = [
            'div[jsaction*="click"]',
            '[role="article"]',
            '.hfpxzc',
            '[data-cid]',
            '.MUxGbd'
        ];
        
        for (const sel of selectors) {
            const elements = document.querySelectorAll(sel);
            if (elements.length > 0) {
                elements.forEach((el, i) => {
                    if (i >= 50) return;
                    results.push({
                        selector: sel,
                        text: el.innerText?.substring(0, 300) || '',
                        index: i
                    });
                });
                break;  // Use first selector that has results
            }
        }
        
        return results;
    }''')
    
    return {
        'feed_content': feed_content,
        'aria_labels': aria_labels,
        'business_cards': business_cards
    }

def detect_google_maps_data(structure):
    """Detect and extract Google Maps business data from aria-labels"""
    
    results = []
    seen_names = set()  # Avoid duplicates
    
    # Use aria_labels which contain business names
    for item in structure['aria_labels']:
        name = item['label'].strip()
        text = item.get('text', '')
        
        # Skip if already seen (duplicate)
        if name in seen_names:
            continue
        
        # Skip non-business labels (more aggressive filtering)
        skip_terms = [
            'menu', 'partager', 'résultats', 'connexion', 'se connecter', 
            'télécharger', 'réduire', 'panneau', 'filtres', 'recherche',
            'google', 'carte', 'plan', 'itinéraire', 'avis', 'étoiles',
            'site web', 'visiter', 'légal', 'mentions', 'ouvrir', 'fermer',
            'enregistré', 'récents', 'applications', 'paramètres',
            'page suivante', 'zoom', 'parcourir', 'images', 'street view',
            'explorer', 'position', 'afficher'
        ]
        
        if any(x in name.lower() for x in skip_terms):
            continue
        
        # Business names should be reasonable length and not all caps
        if len(name) < 3 or len(name) > 100:
            continue
        
        # Should contain at least one uppercase letter (business name)
        if not any(c.isupper() for c in name):
            continue
        
        seen_names.add(name)
        
        # Extract phone number from text
        phone = ''
        phone_patterns = [
            r'[0][67][\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}',
            r'[+][3][3][\s]?[\d]{1,2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}',
        ]
        
        for pattern in phone_patterns:
            match = re.search(pattern, text)
            if match:
                phone = match.group(0).strip()
                break
        
        # Extract website
        website = ''
        if 'http' in text.lower():
            url_match = re.search(r'https?://[^\s]+', text)
            if url_match:
                website = url_match.group(0)
        
        # Extract rating (pattern like "4,9(173)")
        rating = ''
        rating_match = re.search(r'[\d,\.]+\([\d]+\)', text)
        if rating_match:
            rating = rating_match.group(0)
        
        results.append({
            'name': name,
            'phone': phone,
            'rating': rating,
            'website': website,
            'text_preview': text[:200],
            'source': 'Google Maps'
        })
    
    return results

def detect_generic_data(structure):
    """Detect generic structured data (tables, lists, cards)"""
    
    results = []
    feed_text = structure['feed_content']
    
    if not feed_text:
        return results
    
    # Split by lines and look for patterns
    lines = [l.strip() for l in feed_text.split('\n') if l.strip() and len(l.strip()) > 3]
    
    # Look for business-like patterns
    i = 0
    while i < len(lines) - 1:
        line = lines[i]
        
        # Skip generic lines
        if any(x in line.lower() for x in ['menu', 'search', 'filter', 'share', 'partager']):
            i += 1
            continue
        
        # This might be a name - check next lines for phone/rating
        item = {'name': line, 'phone': '', 'rating': '', 'address': ''}
        
        # Check next few lines for phone
        for j in range(i+1, min(i+5, len(lines))):
            next_line = lines[j]
            
            # Phone pattern
            phone_match = re.search(r'[0][67][\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}', next_line)
            if phone_match and not item['phone']:
                item['phone'] = phone_match.group(0)
            
            # Rating pattern
            rating_match = re.search(r'[\d,\.]+\([\d]+\)', next_line)
            if rating_match and not item['rating']:
                item['rating'] = rating_match.group(0)
            
            # Address pattern
            if any(x in next_line.lower() for x in ['rue', 'avenue', 'boulevard', 'place', 'paris', 'lyon']):
                if not item['address'] and len(next_line) > 10 and len(next_line) < 100:
                    item['address'] = next_line
        
        if item['name'] and len(item['name']) < 100:
            item['source'] = 'Generic'
            results.append(item)
        
        i += 1
    
    return results

def save_to_csv(data, source_name='instant-scraper'):
    """Save extracted data to CSV"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y-%m-%d-%H%M')
    filename = f"{source_name}-{timestamp}.csv"
    filepath = OUTPUT_DIR / filename
    
    if not data:
        print("   ⚠️  No data to save")
        return None
    
    # Get fields
    fields = ['name', 'phone', 'rating', 'address', 'website', 'source']
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(data)
    
    print(f"\n✅ Saved: {filepath}")
    print(f"📊 Total items: {len(data)}")
    
    # Stats
    with_phones = sum(1 for d in data if d.get('phone'))
    with_ratings = sum(1 for d in data if d.get('rating'))
    
    print(f"📞 With phones: {with_phones} ({round(with_phones/len(data)*100)}%)")
    print(f"⭐ With ratings: {with_ratings} ({round(with_ratings/len(data)*100)}%)")
    
    return filepath

async def main():
    print("=" * 60)
    print("🚀 INSTANT SCRAPER PRO")
    print("=" * 60)
    print("Exact clone of Instant Data Scraper extension")
    print("Works with ANY structured page (Google Maps, Pages Jaunes, etc.)")
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
            title = await page.title()
            
            print(f"\n📄 Page: {title[:60]}")
            print(f"🔗 URL: {url[:80]}")
            
            # Wait for content to load
            print("\n⏳ Waiting for content to load...")
            await asyncio.sleep(5)
            
            # Get page structure
            print("\n🔍 Analyzing page structure...")
            structure = await get_page_structure(page)
            
            print(f"   Aria-labels found: {len(structure['aria_labels'])}")
            print(f"   Business cards found: {len(structure['business_cards'])}")
            print(f"   Feed content: {len(structure['feed_content'])} chars")
            
            # Detect and extract based on URL
            data = []
            
            if 'google.com/maps' in url:
                print("\n🗺️  Detected: Google Maps")
                data = detect_google_maps_data(structure)
            elif 'pagesjaunes.fr' in url:
                print("\n📖 Detected: Pages Jaunes")
                data = detect_google_maps_data(structure)  # Same extraction works
            else:
                print("\n🔍 Generic detection...")
                data = detect_generic_data(structure)
            
            # Save to CSV
            if data:
                source = 'google-maps' if 'maps' in url else 'instant-scraper'
                save_to_csv(data, source)
                
                print("\n" + "=" * 60)
                print("✅ EXTRACTION COMPLETE!")
                print("=" * 60)
                print("\n🚀 Next steps:")
                print(f"   python3 scripts/import-csv-to-agentcrm.py {OUTPUT_DIR}/*.csv")
                print(f"   python3 scripts/sms-outreach.py")
            else:
                print("\n⚠️  No data extracted")
                print("\n💡 Tips:")
                print("   - Make sure the page has loaded completely")
                print("   - Try scrolling to load more content")
                print("   - Use Instant Data Scraper extension as alternative")
            
            await browser.close()
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
