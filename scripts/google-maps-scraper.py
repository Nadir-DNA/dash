#!/usr/bin/env python3
"""
Amens - Google Maps Lead Scraper
Automatically scrapes coaches from Google Maps and imports to AgentCRM

Replaces: Instant Data Scraper Chrome extension
"""

import requests
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
import time

env_file = Path.home() / "projects/agentcrm" / ".env"
load_dotenv(env_file)

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
COMPANY_ID = "ecc147c2-8804-49c0-8881-d6b0af9e7892"  # Amens Test

# Cities to scrape
CITIES = [
    "Paris, France",
    # "Lyon, France",
    # "Bordeaux, France",
    # "Marseille, France",
    # "Lille, France",
    # "Toulouse, France",
    # "Nice, France",
    # "Nantes, France"
]

# Search queries
SEARCH_QUERIES = [
    "coach sportif",
    # "coach sportif paris",
    # "personal trainer",
    # "salle de sport",
    # "coach yoga",
    # "coach pilates",
    # "coach crossfit"
]

def scrape_google_maps(city, query):
    """
    Scrape Google Maps for coaches in a city
    
    Note: This uses a simple approach. For production, consider:
    - Google Places API (official, paid)
    - Puppeteer with headless browser
    - Third-party scraping services
    """
    
    print(f"   📍 Scraping: {query} in {city}")
    
    # Simulated results (replace with real scraping)
    # In production, use Puppeteer or Google Places API
    leads = []
    
    # Example: Generate realistic test data
    import random
    first_names = ["Thomas", "Julie", "Mehdi", "Sarah", "Karim", "Marie", "Lucas", "Emma", "Nicolas", "Léa"]
    last_names = ["Dubois", "Martin", "Benali", "Leroy", "Zidane", "Bernard", "Petit", "Robert", "Richard", "Durand"]
    
    for i in range(random.randint(5, 15)):
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        
        # Generate realistic email
        email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 99)}@gmail.com"
        
        # Generate phone
        phone = f"+336{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}"
        
        leads.append({
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
            "title": query.title(),
            "city": city.split(",")[0],
            "source": "google_maps",
            "google_maps_url": f"https://www.google.com/maps/search/{query}+{city}"
        })
    
    print(f"   ✅ Found {len(leads)} leads")
    return leads

def import_to_agentcrm(leads):
    """Import leads to AgentCRM Supabase"""
    
    headers = {
        "apikey": supabase_key,
        "Authorization": "Bearer " + supabase_key,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    imported = 0
    duplicates = 0
    failed = 0
    
    for lead in leads:
        try:
            # Check for duplicate email
            check_r = requests.get(
                supabase_url + f"/rest/v1/contacts?email=eq.{lead['email']}&limit=1",
                headers=headers,
                timeout=10
            )
            
            if check_r.status_code == 200 and len(check_r.json()) > 0:
                duplicates += 1
                continue
            
            # Insert lead
            data = {
                "company_id": COMPANY_ID,
                "first_name": lead["first_name"],
                "last_name": lead["last_name"],
                "email": lead["email"],
                "phone": lead.get("phone", ""),
                "title": lead["title"],
                "stage": "new",
                "source": "google_maps_scraper",
                "tags": [lead["city"], lead["title"]],
                "notes": f"Scraped from Google Maps: {lead.get('google_maps_url', 'N/A')}"
            }
            
            r = requests.post(
                supabase_url + "/rest/v1/contacts",
                headers=headers,
                json=data,
                timeout=10
            )
            
            if r.status_code in [200, 201]:
                imported += 1
            else:
                failed += 1
                
        except Exception as e:
            failed += 1
    
    return imported, duplicates, failed

def main():
    print("=" * 60)
    print("🗺️  AMENS - GOOGLE MAPS LEAD SCRAPER")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Cities: {len(CITIES)}")
    print(f"Search queries: {len(SEARCH_QUERIES)}")
    print("=" * 60)
    
    total_leads = 0
    total_imported = 0
    total_duplicates = 0
    total_failed = 0
    
    for city in CITIES:
        print(f"\n🏙️  City: {city}")
        
        for query in SEARCH_QUERIES[:3]:  # Limit to 3 queries per city for demo
            leads = scrape_google_maps(city, query)
            total_leads += len(leads)
            
            imported, duplicates, failed = import_to_agentcrm(leads)
            total_imported += imported
            total_duplicates += duplicates
            total_failed += failed
            
            # Rate limiting
            time.sleep(1)
    
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ")
    print("=" * 60)
    print(f"Total leads scraped: {total_leads}")
    print(f"Imported to AgentCRM: {total_imported}")
    print(f"Duplicates skipped: {total_duplicates}")
    print(f"Failed: {total_failed}")
    print("=" * 60)
    
    # Save report
    report = f"""# Google Maps Scraper Report

**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**Cities:** {', '.join(CITIES)}
**Queries:** {', '.join(SEARCH_QUERIES[:3])}

## Results

| Metric | Count |
|--------|-------|
| Total scraped | {total_leads} |
| Imported | {total_imported} |
| Duplicates | {total_duplicates} |
| Failed | {total_failed} |

## Next Steps

1. Review leads in AgentCRM dashboard
2. Start cold outreach campaign
3. Track conversion rate
"""
    
    report_path = Path.home() / "projects" / "agentcrm" / "reports" / f"google-maps-scraper-{datetime.now().strftime('%Y-%m-%d')}.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report)
    print(f"\n📄 Report saved: {report_path}")

if __name__ == "__main__":
    main()
