#!/usr/bin/env python3
"""
Amens - Playwright Browser with Extension Support

Runs a local browser where YOU can use Instant Data Scraper extension.
Automatically imports scraped data to AgentCRM.

Usage:
    python3 scripts/agent-browser.py
"""

import subprocess
import sys
from pathlib import Path
import time

def install_playwright():
    """Install Playwright and browsers"""
    print("📦 Installing Playwright...")
    subprocess.run([sys.executable, "-m", "pip", "install", "playwright"], check=True)
    subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
    print("✅ Playwright installed!\n")

def main():
    print("=" * 60)
    print("🌐 AMENS - AGENT BROWSER (Playwright)")
    print("=" * 60)
    print("""
This opens a browser on YOUR computer where you can:
1. Use Instant Data Scraper extension
2. Scrape Google Maps leads
3. Export CSV
4. Auto-import to AgentCRM

Instructions:
1. Browser will open
2. Install Instant Data Scraper extension if not installed
3. Go to Google Maps
4. Search "coach sportif"
5. Use Instant Data Scraper
6. Export CSV to: ~/projects/agentcrm/scraped-leads/
7. Script will auto-import to AgentCRM
""")
    print("=" * 60)
    
    # Check if Playwright is installed
    try:
        import playwright
    except ImportError:
        print("⚠️  Playwright not installed")
        response = input("Install now? (y/n): ")
        if response.lower() == 'y':
            install_playwright()
        else:
            print("Please run: pip install playwright && playwright install chromium")
            return
    
    from playwright.sync_api import sync_playwright
    
    # Create scraped-leads directory
    scraped_dir = Path.home() / "projects" / "agentcrm" / "scraped-leads"
    scraped_dir.mkdir(parents=True, exist_ok=True)
    
    print("\n🚀 Launching browser...")
    print("   Extension directory: ~/.config/chromium/Default/Extensions/")
    print("   Install Instant Data Scraper there\n")
    
    with sync_playwright() as p:
        # Launch browser with extension support
        browser = p.chromium.launch(
            headless=False,  # Show browser so you can use it
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
            ]
        )
        
        # Create context with extension support
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        page = context.new_page()
        
        print("✅ Browser opened!")
        print("\n📋 Next steps:")
        print("   1. Install Instant Data Scraper extension")
        print("   2. Go to https://www.google.com/maps")
        print("   3. Search for coaches")
        print("   4. Use Instant Data Scraper")
        print("   5. Export CSV to: ~/projects/agentcrm/scraped-leads/")
        print("\n⏳ Watching for CSV files...")
        print("   (Press Ctrl+C to stop)\n")
        
        # Navigate to Google Maps
        page.goto("https://www.google.com/maps")
        
        # Watch for CSV files in scraped-leads directory
        existing_files = set(scraped_dir.glob("*.csv"))
        
        try:
            while True:
                time.sleep(2)
                
                # Check for new CSV files
                current_files = set(scraped_dir.glob("*.csv"))
                new_files = current_files - existing_files
                
                if new_files:
                    for csv_file in new_files:
                        print(f"\n📄 New CSV detected: {csv_file.name}")
                        print("   Importing to AgentCRM...")
                        
                        # Import to AgentCRM
                        import_to_agentcrm(csv_file)
                        
                        existing_files.add(csv_file)
                        
        except KeyboardInterrupt:
            print("\n\n👋 Stopping browser...")
        
        browser.close()

def import_to_agentcrm(csv_file):
    """Import CSV to AgentCRM Supabase"""
    import csv
    import requests
    import os
    from dotenv import load_dotenv
    
    env_file = Path.home() / "projects" / "agentcrm" / ".env"
    load_dotenv(env_file)
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    COMPANY_ID = "ecc147c2-8804-49c0-8881-d6b0af9e7892"
    
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
                # Extract data from CSV
                name = row.get('Name', row.get('name', ''))
                email = row.get('Email', row.get('email', ''))
                phone = row.get('Phone', row.get('phone', row.get('Telephone', '')))
                address = row.get('Address', row.get('address', row.get('Vicinity', '')))
                
                # Parse name
                name_parts = name.split()
                first_name = name_parts[0] if name_parts else ''
                last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
                
                if not email and not name:
                    continue
                
                # Check for duplicate
                if email:
                    check_r = requests.get(
                        supabase_url + f"/rest/v1/contacts?email=eq.{email}&limit=1",
                        headers=headers,
                        timeout=10
                    )
                    
                    if check_r.status_code == 200 and len(check_r.json()) > 0:
                        duplicates += 1
                        print(f"   ⚠️  Duplicate: {email}")
                        continue
                
                # Insert lead
                data = {
                    "company_id": COMPANY_ID,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email,
                    "phone": phone,
                    "title": "Coach Sportif",
                    "stage": "new",
                    "source": "instant_data_scraper",
                    "tags": ["Google Maps", "Instant Data Scraper"],
                    "notes": f"Address: {address}"
                }
                
                r = requests.post(
                    supabase_url + "/rest/v1/contacts",
                    headers=headers,
                    json=data,
                    timeout=10
                )
                
                if r.status_code in [200, 201]:
                    imported += 1
                    print(f"   ✅ {first_name} {last_name} ({email or 'no email'})")
                else:
                    failed += 1
                    
            except Exception as e:
                failed += 1
                print(f"   ❌ Error: {e}")
    
    print(f"\n📊 Import Summary:")
    print(f"   Imported: {imported}")
    print(f"   Duplicates: {duplicates}")
    print(f"   Failed: {failed}")

if __name__ == "__main__":
    main()
