#!/usr/bin/env python3
"""
Amens - Automated Cron Scraper
Pick a city+profession combination and scrape automatically

Usage:
    python3 scripts/cron-auto-scraper.py
    
Cron (every 4 hours):
    0 */4 * * * cd /home/nadir/projects/agentcrm && /usr/bin/python3 scripts/cron-auto-scraper.py >> logs/cron-scraper.log 2>&1
"""

import os
import sys
import json
import csv
import requests
import asyncio
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load config
load_dotenv(Path.home() / "projects" / "agentcrm" / ".env")

# Import scraper functions
sys.path.insert(0, str(Path.home() / "projects" / "agentcrm" / "scripts"))

# Config
CONFIG_FILE = Path.home() / "projects" / "agentcrm" / "config" / "cron-scraper.conf"
STATE_FILE = Path.home() / "projects" / "agentcrm" / "config" / "cron-state.json"
LOG_FILE = Path.home() / "projects" / "agentcrm" / "logs" / "cron-scraper.log"
OBSIDIAN_LOG = Path.home() / "ObsidianVault" / "20-Projets" / "Amens-Cron-Auto-Scraper-Log.md"

# Cities and professions
CITIES = [
    "Paris", "Lyon", "Marseille", "Bordeaux", 
    "Toulouse", "Nice", "Nantes", "Lille",
    "Montpellier", "Strasbourg", "Rennes", "Reims",
    "Toulon", "Grenoble", "Dijon", "Angers",
    "Nîmes", "Le Havre", "Villeurbanne", "Saint-Etienne"
]

PROFESSIONS = [
    "coach sportif",
    "kinésithérapeute",
    "ostéopathe", 
    "nutritionniste",
    "naturopathe",
    "psychologue",
    "diététicien",
    "préparateur physique",
    "sophrologue",
    "professeur yoga"
]

def load_state():
    """Load current state (which city/profession to scrape next)"""
    if STATE_FILE.exists():
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    else:
        return {
            'city_index': 0,
            'profession_index': 0,
            'last_run': None,
            'total_runs': 0,
            'total_leads': 0
        }

def save_state(state):
    """Save state after run"""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def get_next_combination(state):
    """Get next city+profession combination"""
    city_idx = state['city_index']
    prof_idx = state['profession_index']
    
    city = CITIES[city_idx]
    profession = PROFESSIONS[prof_idx]
    
    # Calculate next indices
    next_prof = (prof_idx + 1) % len(PROFESSIONS)
    next_city = city_idx
    if next_prof == 0:
        next_city = (city_idx + 1) % len(CITIES)
    
    return {
        'city': city,
        'profession': profession,
        'next_city_index': next_city,
        'next_profession_index': next_prof
    }

def normalize_phone(raw):
    """Validate and normalize French phone numbers. Returns '' if invalid."""
    if not raw:
        return ''
    digits = ''.join(c for c in raw if c.isdigit())
    # +336XXXXXXXX → 336XXXXXXXX (11 digits) → 06XXXXXXXX
    if digits.startswith('33') and len(digits) == 11:
        digits = '0' + digits[2:]
    # 00336XXXXXXXX → 06XXXXXXXX
    elif digits.startswith('0033') and len(digits) == 13:
        digits = '0' + digits[4:]
    # Valid: 06XXXXXXXX or 07XXXXXXXX (10 digits)
    if len(digits) == 10 and digits[:2] in ('06', '07'):
        return digits
    # Landline: 01-05, 09 (10 digits)
    if len(digits) == 10 and digits[0] == '0':
        return digits
    return ''

def load_existing_phones(supabase_url, supabase_key):
    """Fetch all existing phone numbers from Supabase for dedup."""
    headers = {
        "apikey": supabase_key,
        "Authorization": "Bearer " + supabase_key,
    }
    phones = set()
    try:
        r = requests.get(
            f"{supabase_url}/rest/v1/contacts?select=phone",
            headers=headers, timeout=30
        )
        for c in r.json():
            p = c.get('phone', '')
            if p:
                phones.add(normalize_phone(p))
    except:
        pass
    return phones

def import_to_agentcrm(csv_file):
    """Import scraped CSV to AgentCRM with dedup + phone validation"""
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    company_id = os.getenv("COMPANY_ID", "ecc147c2-8804-49c0-8881-d6b0af9e7892")
    
    if not csv_file.exists():
        return {'imported': 0, 'duplicates': 0, 'failed': 0, 'skipped_no_phone': 0, 'skipped_invalid_phone': 0}
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        leads = list(reader)
    
    print(f"  📥 {len(leads)} leads bruts à traiter")
    
    # Load existing phones from Supabase for dedup
    existing_phones = load_existing_phones(supabase_url, supabase_key)
    print(f"  📱 {len(existing_phones)} téléphones déjà en base")
    
    imported = duplicates = failed = skipped_no_phone = skipped_invalid_phone = 0
    headers = {
        "apikey": supabase_key,
        "Authorization": "Bearer " + supabase_key,
        "Content-Type": "application/json",
        "Prefer": "return=none"
    }
    
    seen_phones = set()  # Dedup within this batch
    
    for lead in leads:
        try:
            name = lead.get('name', '').strip()
            if not name:
                failed += 1
                continue
            
            # Phone validation
            raw_phone = lead.get('phone', '')
            phone = normalize_phone(raw_phone)
            
            if not raw_phone:
                skipped_no_phone += 1
                continue
            
            if not phone:
                skipped_invalid_phone += 1
                continue
            
            # Dedup: already in Supabase?
            if phone in existing_phones:
                duplicates += 1
                continue
            
            # Dedup: already in this batch?
            if phone in seen_phones:
                duplicates += 1
                continue
            
            seen_phones.add(phone)
            
            name_parts = name.split()
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
            
            is_mobile = phone[:2] in ('06', '07')
            
            data = {
                "company_id": company_id,
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "stage": "new",
                "source": "cron_auto_scraper",
                "tags": [lead.get('location', ''), lead.get('query', ''), "mobile" if is_mobile else "fixe"]
            }
            
            r = requests.post(
                f"{supabase_url}/rest/v1/contacts",
                headers=headers,
                json=data,
                timeout=10
            )
            
            if r.status_code in [200, 201]:
                imported += 1
                existing_phones.add(phone)  # Track for next iteration
            elif r.status_code == 409:
                duplicates += 1
            else:
                failed += 1
                
        except Exception as e:
            failed += 1
    
    print(f"  ✅ Importés: {imported} | Doublons: {duplicates} | Sans tél: {skipped_no_phone} | Tél invalide: {skipped_invalid_phone} | Erreurs: {failed}")
    
    return {'imported': imported, 'duplicates': duplicates, 'failed': failed, 'skipped_no_phone': skipped_no_phone, 'skipped_invalid_phone': skipped_invalid_phone}

def log_to_obsidian(result):
    """Log run to Obsidian"""
    if not OBSIDIAN_LOG.exists():
        # Create header
        content = """# 🤖 Amens - Cron Auto Scraper Log

**Created:** 2026-04-01  
**Status:** ✅ Automated

---

## 📊 Summary

| Metric | Value |
|--------|-------|
| **Total Runs** | {total_runs} |
| **Total Leads** | {total_leads} |
| **Cities Covered** | {cities_done} |
| **Professions Covered** | {professions_done} |

---

## 📝 Run History

"""
        OBSIDIAN_LOG.parent.mkdir(parents=True, exist_ok=True)
        OBSIDIAN_LOG.write_text(content)
    
    # Append run
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
    run_log = f"""### {timestamp} - {result['city']} / {result['profession']}

- **Businesses:** {result['businesses']}
- **Mobiles:** {result['mobiles']} ({result['percentage']}%)
- **Imported:** {result['imported']}
- **Duplicates:** {result['duplicates']}

---

"""
    
    with open(OBSIDIAN_LOG, 'a') as f:
        f.write(run_log)

def run_scraper(profession, city):
    """Run the scraper as subprocess"""
    import subprocess
    
    # Set environment for cron (needs DISPLAY for Chrome)
    env = os.environ.copy()
    env['DISPLAY'] = ':0'  # Assuming display :0
    
    cmd = [
        "/usr/bin/python3",
        str(Path.home() / "projects" / "agentcrm" / "scripts" / "maps-instant-scraper.py"),
        profession,
        city
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=900, env=env)
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return f"⏱️  TIMEOUT after 15 minutes - {profession} in {city}"

def main():
    print("=" * 60)
    print("🤖 AMENS - CRON AUTO SCRAPER")
    print("=" * 60)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Load state
    state = load_state()
    print(f"\n📊 Total runs so far: {state['total_runs']}")
    print(f"📊 Total leads so far: {state['total_leads']}")
    
    # Get next combination
    combo = get_next_combination(state)
    print(f"\n🎯 Scraping: {combo['profession']} in {combo['city']}")
    
    # Run scraper
    print(f"\n🗺️  Starting scrape...")
    output = run_scraper(combo['profession'], combo['city'])
    print(output)
    
    # Parse results from output
    businesses = 0
    mobiles = 0
    for line in output.split('\n'):
        if 'Total businesses:' in line:
            try:
                businesses = int(line.split(':')[1].strip().split()[0])
            except:
                pass
        if 'With mobile phones:' in line:
            try:
                mobiles = int(line.split(':')[1].strip().split()[0])
            except:
                pass
    
    # Find latest CSV
    output_dir = Path.home() / "projects" / "agentcrm" / "scraped-leads"
    csv_files = list(output_dir.glob(f"instant-scrape-{combo['profession'].replace(' ', '-')}-{combo['city'].lower()}-*.csv"))
    
    if not csv_files:
        print("❌ No CSV file found")
        return
    
    latest_csv = max(csv_files, key=lambda p: p.stat().st_mtime)
    print(f"\n📄 CSV: {latest_csv.name}")
    
    # Import to AgentCRM
    print(f"\n📥 Importing to AgentCRM...")
    import_result = import_to_agentcrm(latest_csv)
    
    # Update state
    state['city_index'] = combo['next_city_index']
    state['profession_index'] = combo['next_profession_index']
    state['last_run'] = datetime.now().isoformat()
    state['total_runs'] += 1
    state['total_leads'] += import_result['imported']
    save_state(state)
    
    # Log to Obsidian
    log_result = {
        'city': combo['city'],
        'profession': combo['profession'],
        'businesses': businesses,
        'mobiles': mobiles,
        'percentage': round(mobiles/businesses*100) if businesses else 0,
        'imported': import_result['imported'],
        'duplicates': import_result['duplicates']
    }
    log_to_obsidian(log_result)
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ CRON RUN COMPLETE!")
    print("=" * 60)
    print(f"\n📊 Businesses scraped: {businesses}")
    print(f"📞 Importés (uniques): {import_result['imported']}")
    print(f"⚠️  Doublons: {import_result['duplicates']}")
    print(f"🚫 Sans téléphone: {import_result.get('skipped_no_phone', 0)}")
    print(f"❌ Téléphone invalide: {import_result.get('skipped_invalid_phone', 0)}")
    print(f"\n📍 Next run: {CITIES[state['city_index']]} / {PROFESSIONS[state['profession_index']]}")
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
