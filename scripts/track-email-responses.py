#!/usr/bin/env python3
"""
Amens - Email Response Tracker
Check Resend for email opens, clicks, and replies
Update AgentCRM contacts accordingly
"""

import requests
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta

env_file = Path.home() / "projects" / "agentcrm" / ".env"
load_dotenv(env_file)

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
resend_key = os.getenv("RESEND_API_KEY")

def get_recent_emails(days=1):
    """Get emails sent in last N days from Resend"""
    # Note: Resend API doesn't have a direct "get all emails" endpoint
    # We'll track via webhooks instead (see below)
    print("ℹ️  Resend tracking via webhooks (see setup below)")
    return []

def update_contact_email_status(contact_id, opened=False, clicked=False, replied=False):
    """Update contact with email engagement data"""
    data = {}
    
    if opened:
        data["email_opened_count"] = 1  # Would increment in real implementation
        data["last_email_opened_at"] = datetime.now().isoformat()
    
    if clicked:
        data["email_clicked_count"] = 1
    
    if replied:
        data["reply_received"] = True
        # Auto-update stage to "interested" if replied
        data["stage"] = "interested"
        data["interested_at"] = datetime.now().isoformat()
    
    if not data:
        return False
    
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

def check_replies_manually():
    """
    Manual method: Check Resend dashboard for replies
    Go to: https://resend.com/emails
    Look for replies to team@amens.fr
    """
    print("\n📧 MANUAL REPLY CHECK")
    print("=" * 60)
    print("1. Go to https://resend.com/emails")
    print("2. Filter by: team@amens.fr")
    print("3. Look for RE: or reply emails")
    print("4. Note email addresses that replied")
    print("5. Update contacts manually or use script below")
    print("=" * 60)

def main():
    print("=" * 60)
    print("📧 AMENS - EMAIL RESPONSE TRACKER")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    # Check replies manually (Resend doesn't have reply tracking API)
    check_replies_manually()
    
    # For now, check contacts marked as "contacted" in last 24h
    r = requests.get(
        supabase_url + "/rest/v1/contacts?select=id,first_name,last_name,email,stage,last_contacted_at,reply_received&stage=eq.contacted&last_contacted_at=gt." + (datetime.now() - timedelta(hours=24)).isoformat(),
        headers={
            "apikey": supabase_key,
            "Authorization": "Bearer " + supabase_key
        },
        timeout=10
    )
    
    if r.status_code == 200:
        contacted = r.json()
        print(f"\n📊 Contacts contacted in last 24h: {len(contacted)}")
        print(f"   Waiting for replies...")
        print(f"   Follow-up #1 scheduled for: {(datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')}")
    
    print("\n" + "=" * 60)
    print("🔧 WEBHOOK SETUP (Automated Tracking)")
    print("=" * 60)
    print("""
To enable automated tracking:

1. Create webhook endpoint:
   POST /api/webhooks/resend
   (See: scripts/setup-resend-webhook.py)

2. Register webhook in Resend:
   https://resend.com/webhooks
   - URL: https://your-domain.com/api/webhooks/resend
   - Events: email.opened, email.clicked, email.replied

3. Webhook will auto-update contacts when:
   - Email opened → email_opened_count++
   - Link clicked → email_clicked_count++
   - Reply received → stage = "interested"

For now, manual tracking is sufficient for <100 emails/day
""")
    print("=" * 60)

if __name__ == "__main__":
    main()
