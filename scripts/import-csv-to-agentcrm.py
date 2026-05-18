#!/usr/bin/env python3
"""
Amens - CSV Import to AgentCRM
Import leads from Instant Data Scraper CSV exports

Usage:
    python3 scripts/import-csv-to-agentcrm.py scraped-leads/coaches.csv
"""

import sys
import csv
import requests
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load environment
env_file = Path.home() / "projects" / "agentcrm" / ".env"
load_dotenv(env_file)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
COMPANY_ID = "ecc147c2-8804-49c0-8881-d6b0af9e7892"

def import_csv(csv_file):
    """Import CSV to AgentCRM Supabase"""
    
    print("=" * 60)
    print("📥 IMPORTING CSV TO AGENTCRM")
    print("=" * 60)
    print(f"File: {csv_file}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n❌ Missing Supabase credentials!")
        print("   Check .env file for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return 0, 0, 0
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    imported = 0
    duplicates = 0
    failed = 0
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for i, row in enumerate(reader, 1):
            try:
                # Map CSV columns (Instant Data Scraper format)
                name = row.get('Name', row.get('name', row.get('Business Name', '')))
                phone = row.get('Phone', row.get('phone', row.get('Telephone', '')))
                address = row.get('Address', row.get('address', row.get('Vicinity', '')))
                rating = row.get('Rating', row.get('rating', ''))
                reviews = row.get('Reviews', row.get('reviews', ''))
                website = row.get('Website', row.get('website', ''))
                
                # Parse name
                name_parts = name.split()
                first_name = name_parts[0] if name_parts else ''
                last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
                
                # Extract city from address
                city = ''
                if address:
                    parts = address.split(',')
                    city = parts[-1].strip() if len(parts) > 0 else ''
                
                if not name:
                    continue
                
                # Check for duplicate (by name + city)
                check_r = requests.get(
                    f"{SUPABASE_URL}/rest/v1/contacts?first_name=eq.{first_name}&last_name=eq.{last_name}&limit=1",
                    headers=headers,
                    timeout=10
                )
                
                if check_r.status_code == 200 and len(check_r.json()) > 0:
                    duplicates += 1
                    print(f"   ⚠️  {i}. {name} - Duplicate")
                    continue
                
                # Insert lead
                data = {
                    "company_id": COMPANY_ID,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": "",  # Google Maps doesn't provide emails
                    "phone": phone,
                    "title": "Coach Sportif",
                    "stage": "new",
                    "source": "instant_data_scraper",
                    "tags": [city, "Google Maps"],
                    "notes": f"Address: {address} | Rating: {rating} | Reviews: {reviews} | Website: {website}"
                }
                
                r = requests.post(
                    f"{SUPABASE_URL}/rest/v1/contacts",
                    headers=headers,
                    json=data,
                    timeout=10
                )
                
                if r.status_code in [200, 201]:
                    imported += 1
                    print(f"   ✅ {i}. {name} ({city})")
                else:
                    failed += 1
                    print(f"   ❌ {i}. {name} - Error {r.status_code}")
                    
            except Exception as e:
                failed += 1
                print(f"   ❌ {i}. Error: {e}")
    
    return imported, duplicates, failed

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 import-csv-to-agentcrm.py <csv_file>")
        print("\nExample:")
        print("   python3 import-csv-to-agentcrm.py scraped-leads/coaches-paris.csv")
        sys.exit(1)
    
    csv_file = Path(sys.argv[1])
    
    if not csv_file.exists():
        print(f"❌ File not found: {csv_file}")
        sys.exit(1)
    
    imported, duplicates, failed = import_csv(csv_file)
    
    total = imported + duplicates + failed
    
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ")
    print("=" * 60)
    print(f"Total rows: {total}")
    print(f"Imported: {imported}")
    print(f"Duplicates: {duplicates}")
    print(f"Failed: {failed}")
    if total > 0:
        print(f"Success rate: {round(imported/total*100)}%")
    print("=" * 60)
    
    # Save report
    report = f"""# CSV Import Report

**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**File:** {csv_file.name}

## Results

| Metric | Count |
|--------|-------|
| Total rows | {total} |
| Imported | {imported} |
| Duplicates | {duplicates} |
| Failed | {failed} |
| Success rate | {round(imported/total*100) if total > 0 else 0}% |

## Next Steps

1. Check AgentCRM dashboard
2. Send SMS outreach: `python3 scripts/sms-outreach.py`
3. Track responses
"""
    
    report_path = Path.home() / "projects" / "agentcrm" / "reports" / f"csv-import-{datetime.now().strftime('%Y-%m-%d-%H%M')}.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report)
    print(f"\n📄 Report saved: {report_path}")

if __name__ == "__main__":
    main()
