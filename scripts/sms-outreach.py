#!/usr/bin/env python3
"""
Amens SMS Outreach - Send SMS to scraped coaches
Uses Brevo API (already configured in .env)

Usage:
    python3 scripts/sms-outreach.py
"""

import requests
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
import csv

# Load environment
env_file = Path.home() / "projects" / "agentcrm" / ".env"
load_dotenv(env_file)

# Configuration
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
COMPANY_ID = "ecc147c2-8804-49c0-8881-d6b0af9e7892"

# SMS Templates
SMS_TEMPLATES = {
    "initial": """Bonjour {name}, c'est l'équipe Amens. On aide les coachs à remplir leur planning avec des clients prêts à réserver. Intéressé pour en savoir plus? Répondez OUI""",
    
    "followup_j3": """Bonjour {name}, petit rappel d'Amens. On a aidé Thomas (Paris) à avoir 47 réservations ce mois-ci. Dispo pour un appel de 5 min?""",
    
    "followup_j7": """Bonjour {name}, dernier message d'Amens. Si le remplissage de planning n'est pas un sujet, je vous souhaite beaucoup de succès!""",
}

def get_leads_without_sms():
    """Get leads from AgentCRM without SMS sent yet"""
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
    }
    
    # Get leads with phone numbers, stage=new
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/contacts?select=id,first_name,last_name,phone,stage,tags&stage=eq.new&phone=not.is.null&order=created_at.desc&limit=50",
        headers=headers,
        timeout=10
    )
    
    if r.status_code == 200:
        leads = r.json()
        print(f"📊 Found {len(leads)} leads ready for SMS")
        return leads
    else:
        print(f"❌ Error fetching leads: {r.status_code}")
        return []

def send_sms(phone, message, lead_id):
    """Send SMS via Brevo"""
    
    if not BREVO_API_KEY:
        print("   ⚠️  BREVO_API_KEY not configured - skipping SMS")
        return False, "No API key"
    
    # Clean phone number (remove spaces, add +33 if France)
    phone_clean = phone.replace(" ", "").replace(".", "")
    if phone_clean.startswith("06"):
        phone_clean = "+33" + phone_clean[1:]
    elif phone_clean.startswith("07"):
        phone_clean = "+33" + phone_clean[1:]
    elif not phone_clean.startswith("+"):
        phone_clean = "+33" + phone_clean
    
    url = "https://api.brevo.com/v3/smssenders"
    
    # Send SMS
    sms_url = "https://api.brevo.com/v3/transactionalSMS"
    
    payload = {
        "sender": "Amens",
        "recipient": phone_clean,
        "content": message,
        "tag": "amens_outreach"
    }
    
    headers = {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    try:
        r = requests.post(sms_url, json=payload, headers=headers, timeout=10)
        
        if r.status_code in [200, 201]:
            # Mark lead as SMS sent in Supabase
            mark_sms_sent(lead_id)
            return True, None
        else:
            return False, r.json().get('message', str(r.status_code))
            
    except Exception as e:
        return False, str(e)

def mark_sms_sent(lead_id):
    """Mark lead as SMS sent in Supabase"""
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    
    data = {
        "sms_sent": True,
        "sms_sent_at": datetime.now().isoformat(),
        "stage": "contacted"
    }
    
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/contacts?id=eq.{lead_id}",
        headers=headers,
        json=data,
        timeout=10
    )
    
    return r.status_code in [200, 201]

def main():
    print("=" * 60)
    print("📱 AMENS SMS OUTREACH")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"API Key: {'✅ Configured' if BREVO_API_KEY else '❌ Missing'}")
    print("=" * 60)
    
    if not BREVO_API_KEY:
        print("\n⚠️  BREVO_API_KEY not configured!")
        print("\nTo configure:")
        print("1. Go to https://app.brevo.com/settings/keys/api")
        print("2. Create new API key")
        print("3. Add to ~/.hermes/.env or ~/projects/agentcrm/.env:")
        print("   BREVO_API_KEY=your-key-here")
        print("\nRunning in SIMULATION mode (no SMS sent)\n")
    
    # Get leads
    leads = get_leads_without_sms()
    
    if not leads:
        print("\n✅ No leads ready for SMS - all caught up!")
        return
    
    # Send SMS
    sent = 0
    failed = 0
    
    print(f"\n📤 Sending SMS to {len(leads)} leads...\n")
    
    for i, lead in enumerate(leads[:50], 1):  # Limit to 50/day
        name = f"{lead['first_name']} {lead['last_name']}"
        phone = lead.get('phone', '')
        lead_id = lead['id']
        
        if not phone:
            print(f"   ⚠️  {name}: No phone number")
            failed += 1
            continue
        
        # Get SMS template
        message = SMS_TEMPLATES["initial"].format(name=name.split()[0])
        
        # Send SMS
        success, error = send_sms(phone, message, lead_id)
        
        if success:
            print(f"   ✅ {i}. {name} ({phone})")
            sent += 1
        else:
            print(f"   ❌ {i}. {name} - {error}")
            failed += 1
        
        # Rate limiting (Brevo allows 100 SMS/min, but be conservative)
        import time
        time.sleep(0.5)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ")
    print("=" * 60)
    print(f"Sent: {sent}")
    print(f"Failed: {failed}")
    print(f"Success rate: {round(sent/(sent+failed)*100) if (sent+failed) > 0 else 0}%")
    print("=" * 60)
    
    # Save report
    report = f"""# SMS Outreach Report

**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**Template:** Initial outreach

## Results

| Metric | Count |
|--------|-------|
| Sent | {sent} |
| Failed | {failed} |
| Success rate | {round(sent/(sent+failed)*100) if (sent+failed) > 0 else 0}% |

## Next Steps

1. Wait for responses (SMS replies)
2. Follow up J+3 with non-responders
3. Track conversions to "interested" stage
"""
    
    report_path = Path.home() / "projects" / "agentcrm" / "reports" / f"sms-outreach-{datetime.now().strftime('%Y-%m-%d')}.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report)
    print(f"\n📄 Report saved: {report_path}")

if __name__ == "__main__":
    main()
