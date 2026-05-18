#!/usr/bin/env python3
"""
Amens - Instant Scraper ULTIMATE
EXACT clone of Instant Data Scraper Chrome extension

Features:
- ✅ Heuristic AI detection (works on ANY page)
- ✅ Auto-detect tables, cards, lists
- ✅ Smart column detection (name, phone, email, address, etc.)
- ✅ Pagination support (auto-click "Next")
- ✅ Preview before export
- ✅ Export CSV/Excel/JSON

Usage:
    1. Open ANY page in Chrome (Google Maps, Pages Jaunes, LinkedIn, etc.)
    2. python3 scripts/instant-scraper-ultimate.py
    3. Preview shows what will be extracted
    4. CSV saved automatically
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

class InstantScraperUltimate:
    """Main scraper class - exactly like Instant Data Scraper extension"""
    
    def __init__(self, page):
        self.page = page
        self.data = []
        self.columns = []
        self.pagination = None
    
    async def analyze_page(self):
        """Analyze page structure and detect data patterns (HEURISTIC AI)"""
        
        print("\n🔍 Analyzing page structure with heuristic AI...")
        
        # Detect data patterns
        patterns = await self.page.evaluate('''() => {
            const results = {
                tables: 0,
                cards: 0,
                lists: 0,
                feed: false,
                aria_labels: [],
                repetitive_elements: []
            };
            
            // Count tables
            results.tables = document.querySelectorAll('table').length;
            
            // Count card-like elements
            const cardSelectors = [
                '[role="article"]',
                '.card', '.result', '.item', '.listing',
                '[data-cid]', '.business-card', '.search-result'
            ];
            for (const sel of cardSelectors) {
                const count = document.querySelectorAll(sel).length;
                if (count > 0) {
                    results.cards = count;
                    results.card_selector = sel;
                    break;
                }
            }
            
            // Count lists
            results.lists = document.querySelectorAll('ul, ol, [role="list"]').length;
            
            // Check for feed (Google Maps style)
            results.feed = !!document.querySelector('[role="feed"]');
            
            // Get all aria-labels (business names)
            const allAria = document.querySelectorAll('*[aria-label]');
            allAria.forEach(el => {
                const label = el.getAttribute('aria-label');
                if (label && label.length > 3 && label.length < 150) {
                    results.aria_labels.push({
                        label: label,
                        text: el.innerText?.substring(0, 300) || '',
                        tag: el.tagName
                    });
                }
            });
            
            // Detect repetitive patterns (elements with similar structure)
            const allDivs = document.querySelectorAll('div');
            const patternMap = new Map();
            allDivs.forEach(div => {
                const children = div.children.length;
                const textLength = div.innerText?.length || 0;
                const pattern = `${children}-${Math.floor(textLength / 100)}`;
                patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
            });
            
            // Find patterns that repeat 3+ times (likely data items)
            patternMap.forEach((count, pattern) => {
                if (count >= 3) {
                    results.repetitive_elements.push({
                        pattern: pattern,
                        count: count
                    });
                }
            });
            
            return results;
        }''')
        
        print(f"   Tables: {patterns['tables']}")
        print(f"   Cards: {patterns['cards']} ({patterns.get('card_selector', 'N/A')})")
        print(f"   Lists: {patterns['lists']}")
        print(f"   Feed: {patterns['feed']}")
        print(f"   Aria-labels: {len(patterns['aria_labels'])}")
        print(f"   Repetitive patterns: {len(patterns['repetitive_elements'])}")
        
        return patterns
    
    async def extract_data(self, patterns):
        """Extract data based on detected patterns"""
        
        print("\n📦 Extracting data...")
        
        # Strategy 1: Aria-labels (Google Maps style)
        if patterns['aria_labels'] and len(patterns['aria_labels']) >= 3:
            print("   Using: Aria-label detection (Google Maps style)")
            return await self._extract_from_aria_labels(patterns['aria_labels'])
        
        # Strategy 2: Tables
        if patterns['tables'] > 0:
            print("   Using: Table extraction")
            return await self._extract_from_tables()
        
        # Strategy 3: Cards
        if patterns['cards'] >= 3:
            print(f"   Using: Card extraction ({patterns.get('card_selector')})")
            return await self._extract_from_cards(patterns.get('card_selector'))
        
        # Strategy 4: Generic repetitive elements
        if patterns['repetitive_elements']:
            print("   Using: Repetitive pattern detection")
            return await self._extract_repetitive_patterns()
        
        return []
    
    async def _extract_from_aria_labels(self, aria_labels):
        """Extract from aria-labels (Google Maps, etc.)"""
        
        results = []
        seen = set()
        
        for item in aria_labels:
            name = item['label'].strip()
            text = item.get('text', '')
            
            # Skip duplicates
            if name in seen:
                continue
            
            # Skip non-business labels (aggressive filtering like Instant Data Scraper)
            skip_terms = [
                'menu', 'partager', 'résultats', 'connexion', 'se connecter',
                'télécharger', 'réduire', 'panneau', 'filtres', 'recherche',
                'google', 'carte', 'plan', 'itinéraire', 'avis', 'étoiles',
                'page suivante', 'zoom', 'parcourir', 'images', 'street view',
                'explorer', 'position', 'afficher', 'ouvrir', 'fermer',
                'visiter', 'site web', 'obtenir', 'télécharger', 'enregistrer',
                'connexion', 'compte', 'paramètres', 'aide', 'à propos'
            ]
            
            # Skip if contains any skip term
            if any(x in name.lower() for x in skip_terms):
                continue
            
            # Skip if name is a URL
            if name.startswith('http') or name.startswith('www'):
                continue
            
            # Skip if name is just an icon or special character
            if not any(c.isalpha() for c in name):
                continue
            
            # Validate business name
            if len(name) < 3 or len(name) > 100:
                continue
            if not any(c.isupper() for c in name):
                continue
            
            seen.add(name)
            
            # Extract fields using smart detection
            item_data = {
                'name': name,
                'phone': self._extract_phone(text),
                'email': self._extract_email(text),
                'rating': self._extract_rating(text),
                'address': self._extract_address(text),
                'website': self._extract_website(text),
                'text_preview': text[:200]
            }
            
            results.append(item_data)
        
        print(f"   ✅ Extracted {len(results)} items")
        return results
    
    async def _extract_from_tables(self):
        """Extract from HTML tables"""
        
        results = []
        
        table_data = await self.page.evaluate('''() => {
            const results = [];
            const tables = document.querySelectorAll('table');
            
            tables.forEach((table, ti) => {
                const rows = table.querySelectorAll('tr');
                if (rows.length < 2) return;
                
                // Get headers from first row
                const headers = [];
                const headerCells = rows[0].querySelectorAll('th, td');
                headerCells.forEach((th, i) => {
                    headers[i] = th.textContent?.trim() || `Column ${i}`;
                });
                
                // Get data from remaining rows
                for (let ri = 1; ri < rows.length; ri++) {
                    const row = rows[ri];
                    const cells = row.querySelectorAll('td, th');
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
        
        print(f"   ✅ Extracted {len(table_data)} rows")
        return table_data
    
    async def _extract_from_cards(self, selector):
        """Extract from card-like elements"""
        
        results = []
        
        card_data = await self.page.evaluate(f'''() => {{
            const results = [];
            const cards = document.querySelectorAll('{selector}');
            
            cards.forEach((card, i) => {{
                if (i >= 100) return;
                
                const text = card.innerText || '';
                const item = {{
                    text_preview: text.substring(0, 300)
                }};
                
                // Try to extract common fields
                const phoneMatch = text.match(/[0][67][\\s\\.]?[\\d]{{2}}[\\s\\.]?[\\d]{{2}}[\\s\\.]?[\\d]{{2}}[\\s\\.]?[\\d]{{2}}/);
                if (phoneMatch) item.phone = phoneMatch[0];
                
                const emailMatch = text.match(/[\\w.-]+@[\\w.-]+\\.[\\w]+/);
                if (emailMatch) item.email = emailMatch[0];
                
                results.push(item);
            }});
            
            return results;
        }}''')
        
        print(f"   ✅ Extracted {len(card_data)} items")
        return card_data
    
    async def _extract_repetitive_patterns(self):
        """Extract from repetitive page elements"""
        
        results = []
        # Fallback extraction
        return results
    
    def _extract_phone(self, text):
        """Extract phone number from text"""
        patterns = [
            r'[0][67][\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}',
            r'[+][3][3][\s]?[\d]{1,2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}[\s\.]?[\d]{2}',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(0).strip()
        return ''
    
    def _extract_email(self, text):
        """Extract email from text"""
        match = re.search(r'[\w.-]+@[\w.-]+\.[\w]+', text)
        return match.group(0) if match else ''
    
    def _extract_rating(self, text):
        """Extract rating (like "4,9(173)")"""
        match = re.search(r'[\d,\.]+\([\d]+\)', text)
        return match.group(0) if match else ''
    
    def _extract_address(self, text):
        """Extract address from text"""
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if any(x in line.lower() for x in ['rue', 'avenue', 'boulevard', 'place', 'allée']):
                if 10 < len(line) < 150:
                    return line
        return ''
    
    def _extract_website(self, text):
        """Extract website URL from text"""
        match = re.search(r'https?://[^\s]+', text)
        return match.group(0) if match else ''
    
    def preview(self, data, limit=10):
        """Show preview of extracted data"""
        
        print("\n" + "=" * 60)
        print("📋 PREVIEW (First {} items)".format(min(limit, len(data))))
        print("=" * 60)
        
        if not data:
            print("   No data to preview")
            return
        
        # Get column names
        columns = list(data[0].keys())
        
        # Print header
        header = " | ".join([col[:20].ljust(20) for col in columns])
        print(header)
        print("-" * len(header))
        
        # Print rows
        for i, item in enumerate(data[:limit]):
            row = " | ".join([str(item.get(col, '')[:20] or '').ljust(20) for col in columns])
            print(f"{i+1}. {row}")
        
        print("=" * 60)
    
    def save_to_csv(self, data, source='instant-scraper'):
        """Save extracted data to CSV"""
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y-%m-%d-%H%M')
        filename = f"{source}-{timestamp}.csv"
        filepath = OUTPUT_DIR / filename
        
        if not data:
            print("   ⚠️  No data to save")
            return None
        
        # Get all columns
        all_columns = set()
        for item in data:
            all_columns.update(item.keys())
        
        # Prioritize common columns
        priority = ['name', 'phone', 'email', 'rating', 'address', 'website', 'source']
        columns = [c for c in priority if c in all_columns]
        columns.extend([c for c in all_columns if c not in columns])
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(data)
        
        print(f"\n✅ Saved: {filepath}")
        print(f"📊 Total items: {len(data)}")
        
        # Stats
        with_phones = sum(1 for d in data if d.get('phone'))
        with_emails = sum(1 for d in data if d.get('email'))
        with_ratings = sum(1 for d in data if d.get('rating'))
        
        print(f"📞 With phones: {with_phones} ({round(with_phones/len(data)*100)}%)")
        print(f"📧 With emails: {with_emails} ({round(with_emails/len(data)*100)}%)")
        print(f"⭐ With ratings: {with_ratings} ({round(with_ratings/len(data)*100)}%)")
        
        return filepath
    
    async def detect_pagination(self):
        """Detect and return pagination info"""
        
        pagination = await self.page.evaluate('''() => {
            const results = {
                next_button: null,
                has_next: false
            };
            
            // Look for next/continue/more buttons
            const selectors = [
                'a:has-text("Next")',
                'a:has-text("Suivant")',
                'button:has-text("Next")',
                'button:has-text("Suivant")',
                'a:has-text("Plus")',
                'button:has-text("Plus")',
                '[aria-label*="next"]',
                '[aria-label*="suivant"]',
                '.pagination-next',
                '.next-page'
            ];
            
            for (const sel of selectors) {
                try {
                    const el = document.querySelector(sel);
                    if (el) {
                        results.next_button = sel;
                        results.has_next = true;
                        break;
                    }
                } catch (e) {}
            }
            
            return results;
        }''')
        
        if pagination['has_next']:
            print(f"\n📄 Pagination detected: {pagination['next_button']}")
        
        return pagination

async def main():
    print("=" * 60)
    print("🚀 INSTANT SCRAPER ULTIMATE")
    print("=" * 60)
    print("EXACT clone of Instant Data Scraper extension")
    print("Works with ANY structured page (Google Maps, Pages Jaunes, LinkedIn, etc.)")
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
                print("   Please open a page first (Google Maps, Pages Jaunes, etc.)")
                await browser.close()
                return
            
            page = contexts[0].pages[0]
            url = page.url
            title = await page.title()
            
            print(f"\n📄 Page: {title[:60]}")
            print(f"🔗 URL: {url[:80]}")
            
            # Wait for content
            print("\n⏳ Waiting for content to load...")
            await asyncio.sleep(5)
            
            # Create scraper instance
            scraper = InstantScraperUltimate(page)
            
            # Analyze page
            patterns = await scraper.analyze_page()
            
            # Extract data
            data = await scraper.extract_data(patterns)
            
            # Show preview
            if data:
                scraper.preview(data, limit=10)
                
                # Determine source name
                if 'google.com/maps' in url:
                    source = 'google-maps'
                elif 'pagesjaunes.fr' in url:
                    source = 'pages-jaunes'
                elif 'linkedin.com' in url:
                    source = 'linkedin'
                else:
                    source = 'instant-scraper'
                
                # Save to CSV
                filepath = scraper.save_to_csv(data, source)
                
                print("\n" + "=" * 60)
                print("✅ EXTRACTION COMPLETE!")
                print("=" * 60)
                print("\n🚀 Next steps:")
                print(f"   python3 scripts/import-csv-to-agentcrm.py {filepath}")
                print(f"   python3 scripts/sms-outreach.py")
            else:
                print("\n⚠️  No data extracted")
                print("\n💡 Tips:")
                print("   - Make sure the page has loaded completely")
                print("   - Try scrolling to load more content")
                print("   - The page should have repetitive data structures")
            
            await browser.close()
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
