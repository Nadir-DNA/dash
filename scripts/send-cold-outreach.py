#!/usr/bin/env python3
"""
Amens - Cold Outreach Email Sender
Sends 50 emails/day to new leads via Resend
"""

import requests
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

env_file = Path.home() / "projects" / "agentcrm" / ".env"
load_dotenv(env_file)

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
resend_key = os.getenv("RESEND_API_KEY")
COMPANY_ID = "ecc147c2-8804-49c0-8881-d6b0af9e7892"

# Email template
EMAIL_TEMPLATE = """Bonjour {first_name},

Je suis tombé sur votre profil en cherchant des coachs sur {city}.

Je me demandais : est-ce que vous arrivez à remplir votre planning facilement en ce moment ?

On aide les coachs indépendants à trouver de nouveaux clients via Amens (plateforme de réservation en ligne).

Si vous aviez 5-10 réservations de plus par mois, ça changerait quoi pour vous ?

Bonne journée,
L'équipe Amens
amens.fr"""

def get_new_leads(limit=50):
    """Get new leads from Supabase"""
    r = requests.get(
        supabase_url + f"/rest/v1/contacts?select=id,first_name,last_name,email,title,tags,stage&stage=eq.new&company_id=eq.{COMPANY_ID}&limit={limit}",
        headers={
            "apikey": supabase_key,
            "Authorization": "Bearer " + supabase_key
        },
        timeout=10
    )
    if r.status_code == 200:
        return r.json()
    return []

def send_email(lead):
    """Send email via Resend"""
    city = lead["tags"][0] if lead.get("tags") and len(lead["tags"]) > 0 else "votre ville"
    
    body = EMAIL_TEMPLATE.format(
        first_name=lead["first_name"],
        city=city
    )
    
    r = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json"
        },
        json={
            "from": "Amens <team@amens.fr>",
            "to": [lead["email"]],
            "subject": "Question sur votre activité de coach",
            "text": body
        },
        timeout=10
    )
    
    return r.status_code in [200, 201], r.json() if r.status_code not in [200, 201] else None

def update_contact_stage(contact_id, stage, contacted_at=True):
    """Update contact stage in Supabase"""
    data = {"stage": stage}
    if contacted_at:
        data["last_contacted_at"] = datetime.now().isoformat()
    
    r = requests.patch(
        supabase_url + f"/rest/v1/contacts?id=eq.{contact_id}",
        headers={
            "apikey": supabase_key,
            "Authorization": "Bearer " + supabase_key,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        json=data,
        timeout=10
    )
    
    return r.status_code in [200, 201]

def main():
    print("=" * 60)
    print("📧 AMENS - COLD OUTREACH")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Target: 50 emails/day")
    print("=" * 60)
    
    leads = get_new_leads(50)
    print(f"\n📋 Found {len(leads)} new leads\n")
    
    sent = 0
    failed = 0
    
    for i, lead in enumerate(leads, 1):
        success, error = send_email(lead)
        
        if success:
            # Update stage to "contacted"
            update_contact_stage(lead["id"], "contacted")
            print(f"   ✅ {i}. {lead['first_name']} {lead['last_name']} ({lead['email']})")
            sent += 1
        else:
            print(f"   ❌ {i}. {lead['first_name']} {lead['last_name']} - {error}")
            failed += 1
    
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ:")
    print(f"   Envoyés: {sent}/{len(leads)}")
    print(f"   Échecs: {failed}/{len(leads)}")
    if len(leads) > 0:
        print(f"   Succès: {round(sent/len(leads)*100)}%")
    print("=" * 60)
    
    # Save report
    report = f"""# Cold Outreach Report

**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**Sent:** {sent}
**Failed:** {failed}
**Success Rate:** {round(sent/len(leads)*100) if len(leads) > 0 else 0}%
"""
    Path.home().joinpath("projects/agentcrm/scripts/outreach-report.md").write_text(report)
    print(f"\n📄 Report saved to outreach-report.md")

if __name__ == "__main__":
    main()
