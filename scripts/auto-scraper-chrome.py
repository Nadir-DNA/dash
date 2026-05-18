#!/usr/bin/env python3
"""
Amens Auto-Scraper - Google Maps with YOUR Chrome Profile
Uses Hermes chrome-profiles plugin for real browser with extensions

Usage:
    1. First run: ./setup-chrome-profile.sh
    2. Then: python3 scripts/auto-scraper-chrome.py
"""

import asyncio
from playwright.async_api import async_playwright
import csv
import time
from pathlib import Path
from datetime import datetime

# Configuration
CITIES = ["Paris"]  # Test with 1 city first
SEARCH_QUERIES = ["coach sportif"]
OUTPUT_DIR = Path.home() / "projects" / "agentcrm" / "scraped-leads"

async def scrape_google_maps(page, city, query):
    """Scrape Google Maps using YOUR Chrome profile"""
    
    print(f"   📍 Scraping: {query} in {city}")
    
    # Navigate to Google Maps
    search_url = f"https://www.google.com/maps/search/{query}+{city}"
    await page.goto(search_url, wait_until="domcontentloaded")
    
    # Wait for page to load (your browser has cookies, so should work)
    await asyncio.sleep(5)
    
    # Accept cookies if popup appears
    try:
        await page.click('button:has-text("Accepter"), button:has-text("Accept")', timeout=3000)
        await asyncio.sleep(2)
    except:
        pass
    
    # Wait for results
    try:
        await page.wait_for_selector('div[role="feed"]', timeout=15000)
        print(f"   ✅ Results loaded")
    except:
        print(f"   ⚠️  Waiting more time...")
        await asyncio.sleep(10)
    
    # Scroll to load more
    await page.evaluate("window.scrollBy(0, 5000)")
    await asyncio.sleep(3)
    await page.evaluate("window.scrollBy(0, 5000)")
    await asyncio.sleep(3)
    
    # Extract businesses
    leads = await page.evaluate('''() => {
        const results = [];
        const feed = document.querySelector('div[role="feed"]');
        if (!feed) return results;
        
        const items = feed.querySelectorAll('[role="article"]');
        console.log('Found items:', items.length);
        
        items.forEach(item => {
            try {
                const name = item.querySelector('[role="heading"]')?.textContent?.trim() || '';
                if (name && name.length > 2) {
                    results.push({
                        name: name,
                        rating: item.querySelector('.yi40Hd')?.textContent?.trim() || '',
                        reviews: item.querySelector('[aria-label*="avis"]')?.textContent?.trim() || '',
                        address: item.querySelector('.W4Efsd')?.textContent?.trim() || '',
                        google_maps_url: window.location.href,
                        scraped_at: new Date().toISOString()
                    });
                    console.log('Business:', name);
                }
            } catch (e) {
                console.log('Error:', e.message);
            }
        });
        
        return results;
    }''')
    
    print(f"   ✅ Found {len(leads)} businesses")
    
    # Save screenshot
    screenshot_path = OUTPUT_DIR / f"screenshot-{city}-{query.replace(' ', '-')}.png"
    await page.screenshot(path=str(screenshot_path), full_page=True)
    print(f"   📸 Screenshot: {screenshot_path}")
    
    return leads

def save_to_csv(leads, city, query):
    """Save leads to CSV"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    filename = f"google-maps-{city}-{query.replace(' ', '-')}.csv"
    filepath = OUTPUT_DIR / filename
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['name', 'rating', 'reviews', 'address', 'google_maps_url', 'scraped_at']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(leads)
    
    print(f"   📄 Saved: {filepath}")
    return filepath

async def main():
    print("=" * 60)
    print("🗺️  AMENS AUTO-SCRAPER (YOUR Chrome Profile)")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Using: YOUR Chrome with YOUR extensions")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)
    
    async with async_playwright() as p:
        # Launch Chrome with YOUR profile
        # This uses your real Chrome data directory
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=str(Path.home() / ".config" / "google-chrome"),
            headless=False,  # Show browser
            channel="chrome",  # Use installed Chrome
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
            ],
            viewport={'width': 1920, 'height': 1080}
        )
        
        page = await browser.new_page()
        
        # Inject anti-detection
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
                    
                    if leads:
                        save_to_csv(leads, city, query)
                        
                        # Import to AgentCRM
                        print("   📥 Importing to AgentCRM...")
                        from import_csv_to_agentcrm import import_csv
                        csv_file = OUTPUT_DIR / f"google-maps-{city}-{query.replace(' ', '-')}.csv"
                        imported, duplicates, failed = import_csv(str(csv_file))
                        print(f"   ✅ Imported: {imported}, Duplicates: {duplicates}")
                    
                    await asyncio.sleep(3)
                    
                except Exception as e:
                    print(f"   ❌ Error: {e}")
        
        await browser.close()
    
    print("\n" + "=" * 60)
    print("✅ COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
