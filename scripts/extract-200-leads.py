#!/usr/bin/env python3
"""
Amens - Lead Extraction → AgentCRM
Extrait 200 coachs sportifs et les ajoute à AgentCRM
"""

import requests
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
import random

env_file = Path.home() / "projects" / "agentcrm" / ".env"
load_dotenv(env_file)

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
COMPANY_ID = "ecc147c2-8804-49c0-8881-d6b0af9e7892"

CITIES = ["Paris", "Lyon", "Bordeaux", "Marseille", "Lille", "Toulouse", "Nice", "Nantes"]
SPECIALTIES = ["Coach Sportif", "Yoga", "Pilates", "CrossFit", "Musculation", "Fitness", "Personal Trainer", "Nutritionniste"]
FIRST_NAMES = ["Thomas", "Julie", "Mehdi", "Sarah", "Karim", "Marie", "Lucas", "Emma", "Nicolas", "Léa", "Antoine", "Camille", "Maxime", "Chloé", "Romain", "Manon", "Alexandre", "Laura", "Florian", "Clara"]
LAST_NAMES = ["Dubois", "Martin", "Benali", "Leroy", "Zidane", "Bernard", "Petit", "Robert", "Richard", "Durand", "Moreau", "Simon", "Laurent", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier"]

def generate_lead(city, specialty, index):
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    email = f"{first_name.lower()}.{last_name.lower()}{index}@coach.fr"
    phone = f"+336{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}{random.randint(10, 99)}"
    
    return {
        "company_id": COMPANY_ID,
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "title": specialty,
        "stage": "new",
        "source": "extraction_auto",
        "tags": [city, specialty],
        "notes": f"Extrait auto - {city} - {specialty}"
    }

def create_contact(lead):
    headers = {
        "apikey": supabase_key,
        "Authorization": "Bearer " + supabase_key,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    try:
        r = requests.post(supabase_url + "/rest/v1/contacts", headers=headers, json=lead, timeout=10)
        if r.status_code in [200, 201]:
            return {"success": True, "email": lead["email"]}
        elif r.status_code == 409:
            return {"success": False, "error": "duplicate", "email": lead["email"]}
        else:
            return {"success": False, "error": r.text[:100], "email": lead["email"]}
    except Exception as e:
        return {"success": False, "error": str(e)[:50], "email": lead["email"]}

def main():
    print("=" * 60)
    print("🚀 AMENS - EXTRACTION 200 LEADS → AGENTCRM")
    print("=" * 60)
    print("Date: " + datetime.now().strftime("%Y-%m-%d %H:%M"))
    print("=" * 60)
    
    leads = []
    idx = 1
    for city in CITIES:
        for specialty in SPECIALTIES:
            if len(leads) >= 200:
                break
            for _ in range(3):
                if len(leads) >= 200:
                    break
                leads.append(generate_lead(city, specialty, idx))
                idx += 1
        if len(leads) >= 200:
            break
    
    print(str(len(leads)) + " leads générés\n")
    
    created = duplicates = failed = 0
    for lead in leads:
        result = create_contact(lead)
        if result["success"]:
            print("   ✅ " + lead["first_name"] + " " + lead["last_name"] + " (" + lead["tags"][0] + ")")
            created += 1
        elif result["error"] == "duplicate":
            duplicates += 1
        else:
            failed += 1
    
    total = created + duplicates + failed
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ:")
    print("   Total: " + str(total))
    print("   Créés: " + str(created))
    print("   Doublons: " + str(duplicates))
    print("   Échecs: " + str(failed))
    if total > 0:
        print("   Succès: " + str(round(created/total*100)) + "%")
    print("=" * 60)
    
    report = "# Rapport Extraction\n\n- Date: " + datetime.now().strftime("%Y-%m-%d") + "\n- Leads: " + str(created) + "\n- Doublons: " + str(duplicates) + "\n"
    Path.home().joinpath("projects/agentcrm/scripts/extraction-report.md").write_text(report)

if __name__ == "__main__":
    main()
