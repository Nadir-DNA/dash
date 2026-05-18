#!/usr/bin/env python3
"""
Amens - Follow-up Email Sender (J+3, J+7, J+10)
Sends follow-up emails to contacts who haven't replied
"""

import requests
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta

env_file = Path.home() / "projects/agentcrm" / ".env"
load_dotenv(env_file)

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
resend_key = os.getenv("RESEND_API_KEY")

# Follow-up templates
FOLLOWUP_TEMPLATES = {
    "J+3": """Bonjour {first_name},

Je voulais juste m'assurer que vous aviez bien reçu mon message.

Je sais que vous êtes probablement occupé(e) avec vos séances.

Pour faire simple : Amens vous apporte des clients prêts à réserver, sans que vous ayez à prospecter.

Quelques coachs qui nous font confiance :
• Thomas (Paris 11ème) : 47 réservations ce mois-ci
• Julie (Lyon) : +30% de CA depuis 3 mois
• Mehdi (Bordeaux) : planning rempli 3 semaines à l'avance

Ça vous dirait qu'on en parle 10 minutes ?

Bonne journée,
L'équipe Amens""",

    "J+7": """Bonjour {first_name},

Petit check-in rapide.

Je me demandais si la question du remplissage de planning était un sujet pour vous en ce moment ?

On aide les coachs à avoir 5-10 réservations de plus par mois, sans prospection active.

Si c'est un sujet, je peux vous montrer comment ça marche en 10 minutes.

Dispo cette semaine ?

L'équipe Amens""",

    "J+10": """Bonjour {first_name},

Je n'ai pas eu de retour de votre part, je me dis que le timing n'est pas idéal.

Je vais fermer votre dossier de mon côté.

Si jamais vous changez d'avis ou si votre planning se libère, n'hésitez pas à me recontacter.

En attendant, je vous souhaite beaucoup de succès avec vos clients !

L'équipe Amens
amens.fr"""
}

def get_followup_candidates(days_since_contact):
    """Get contacts who were contacted X days ago and haven't replied"""
    date_threshold = (datetime.now() - timedelta(days=days_since_contact)).isoformat()
    
    r = requests.get(
        supabase_url + f"/rest/v1/contacts?select=id,first_name,last_name,email,title,tags,stage,last_contacted_at,reply_received&stage=eq.contacted&last_contacted_at=lt.{date_threshold}&reply_received=eq.false&limit=50",
        headers={
            "apikey": supabase_key,
            "Authorization": "Bearer " + supabase_key
        },
        timeout=10
    )
    
    if r.status_code == 200:
        return r.json()
    return []

def send_followup(lead, template_name):
    """Send follow-up email via Resend"""
    city = lead["tags"][0] if lead.get("tags") and len(lead["tags"]) > 0 else "votre ville"
    
    body = FOLLOWUP_TEMPLATES[template_name].format(
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
            "subject": f"Re: Question sur votre activité de coach ({template_name})",
            "text": body
        },
        timeout=10
    )
    
    return r.status_code in [200, 201], r.json() if r.status_code not in [200, 201] else None

def main():
    print("=" * 60)
    print("📧 AMENS - FOLLOW-UP EMAILS")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d')}")
    print("=" * 60)
    
    # Check for J+3, J+7, J+10 follow-ups
    followup_schedule = [
        (3, "J+3"),
        (7, "J+7"),
        (10, "J+10")
    ]
    
    total_sent = 0
    
    for days, template_name in followup_schedule:
        candidates = get_followup_candidates(days)
        
        if len(candidates) > 0:
            print(f"\n📋 {template_name} Follow-up: {len(candidates)} candidates")
            
            for lead in candidates:
                success, error = send_followup(lead, template_name)
                
                if success:
                    print(f"   ✅ {lead['first_name']} {lead['last_name']}")
                    total_sent += 1
                else:
                    print(f"   ❌ {lead['first_name']} {lead['last_name']} - {error}")
        else:
            print(f"\n⏭️  {template_name}: No candidates yet")
    
    print("\n" + "=" * 60)
    print(f"📊 Total follow-ups sent: {total_sent}")
    print("=" * 60)

if __name__ == "__main__":
    main()
