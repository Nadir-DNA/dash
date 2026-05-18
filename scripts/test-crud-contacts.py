#!/usr/bin/env python3
"""
AgentCRM - Test CRUD Contacts (Avec Company ID)
"""

import requests
import os
from pathlib import Path
from dotenv import load_dotenv

env_file = Path.home() / "projects" / "agentcrm" / ".env"
load_dotenv(env_file)

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Utiliser company "Amens Test"
COMPANY_ID = "ecc147c2-8804-49c0-8881-d6b0af9e7892"  # Amens Test

print("=" * 60)
print("🧪 TEST CRUD - 5 LEADS (Avec Company ID)")
print("=" * 60)

test_leads = [
    {"company_id": COMPANY_ID, "first_name": "Thomas", "last_name": "Dubois", "email": "thomas.dubois1@coach.fr", "phone": "+33612345678", "title": "Coach Sportif", "stage": "new", "source": "test_extraction", "tags": ["Paris", "Fitness"]},
    {"company_id": COMPANY_ID, "first_name": "Julie", "last_name": "Martin", "email": "julie.martin2@yoga.fr", "phone": "+33623456789", "title": "Prof de Yoga", "stage": "new", "source": "test_extraction", "tags": ["Lyon", "Bien-être"]},
    {"company_id": COMPANY_ID, "first_name": "Mehdi", "last_name": "Benali", "email": "mehdi.benali3@crossfit.fr", "phone": "+33634567890", "title": "Coach CrossFit", "stage": "new", "source": "test_extraction", "tags": ["Bordeaux", "Fitness"]},
    {"company_id": COMPANY_ID, "first_name": "Sarah", "last_name": "Leroy", "email": "sarah.leroy4@pilates.fr", "phone": "+33645678901", "title": "Prof de Pilates", "stage": "new", "source": "test_extraction", "tags": ["Paris", "Bien-être"]},
    {"company_id": COMPANY_ID, "first_name": "Karim", "last_name": "Zidane", "email": "karim.zidane5@musculation.fr", "phone": "+33656789012", "title": "Coach Musculation", "stage": "new", "source": "test_extraction", "tags": ["Marseille", "Fitness"]},
]

headers = {
    "apikey": supabase_key,
    "Authorization": "Bearer " + supabase_key,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

created = 0
failed = 0

for i, lead in enumerate(test_leads, 1):
    try:
        r = requests.post(
            supabase_url + "/rest/v1/contacts",
            headers=headers,
            json=lead,
            timeout=10
        )
        
        if r.status_code in [200, 201]:
            data = r.json()
            print("   ✅ Lead " + str(i) + ": " + lead["first_name"] + " " + lead["last_name"] + " (" + lead["title"] + ")")
            created += 1
        elif r.status_code == 409:
            print("   ⚠️ Lead " + str(i) + ": Déjà existant (email duplicate)")
            failed += 1
        else:
            print("   ❌ Lead " + str(i) + ": Erreur " + str(r.status_code))
            failed += 1
    except Exception as e:
        print("   ❌ Lead " + str(i) + ": Exception - " + str(e)[:50])
        failed += 1

print("\n" + "=" * 60)
print("📊 RÉSUMÉ:")
print("   Créés: " + str(created) + "/5")
print("   Échecs: " + str(failed) + "/5")
if (created + failed) > 0:
    print("   Taux de succès: " + str(round(created/(created+failed)*100)) + "%")
print("=" * 60)
