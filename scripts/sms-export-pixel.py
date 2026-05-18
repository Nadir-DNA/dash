#!/usr/bin/env python3
"""
Amens - SMS Export for Google Pixel
Export leads with phone numbers in format optimized for SMS sending from your phone

Creates:
1. CSV with phone numbers formatted for Android
2. Click-to-send links (sms: protocol)
3. Batch groups (50 SMS max per batch)

Usage:
    python3 scripts/sms-export-pixel.py
"""

import csv
import requests
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

env_file = Path.home() / "projects" / "agentcrm" / ".env"
load_dotenv(env_file)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OUTPUT_DIR = Path.home() / "projects" / "agentcrm" / "scraped-leads"

# SMS Template
SMS_TEMPLATE = """Bonjour {name}, c'est l'équipe Amens. On aide les coachs à remplir leur planning avec des clients prêts à réserver. Intéressé pour en savoir plus? Répondez OUI"""

def get_leads_with_phones(limit=500):
    """Get leads from AgentCRM with phone numbers"""
    
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/contacts?select=id,first_name,last_name,phone,stage,source&stage=eq.new&phone=not.is.null&order=created_at.desc&limit={limit}",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY
        },
        timeout=10
    )
    
    if r.status_code == 200:
        return r.json()
    return []

def format_phone_for_sms(phone):
    """Format phone number for Android SMS"""
    # Remove spaces, dots, dashes
    cleaned = ''.join(c for c in phone if c.isdigit())
    
    # Add +33 if French number without country code
    if cleaned.startswith('0'):
        cleaned = '+33' + cleaned[1:]
    elif cleaned.startswith('33'):
        cleaned = '+' + cleaned
    
    return cleaned

def create_sms_link(phone, message):
    """Create sms: link for Android"""
    import urllib.parse
    formatted = format_phone_for_sms(phone)
    encoded_msg = urllib.parse.quote(message)
    return f"sms:{formatted}?body={encoded_msg}"

def export_for_pixel(leads, batch_size=50):
    """Export leads optimized for Google Pixel SMS"""
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime('%Y-%m-%d-%H%M')
    
    # Filter leads with phones
    leads_with_phones = [l for l in leads if l.get('phone')]
    
    print(f"\n📊 Total leads: {len(leads)}")
    print(f"📞 With phones: {len(leads_with_phones)}")
    
    # Create batches
    batches = [leads_with_phones[i:i+batch_size] for i in range(0, len(leads_with_phones), batch_size)]
    
    print(f"📦 Batches created: {len(batches)} ({batch_size} SMS/batch)")
    print()
    
    # Export 1: CSV with formatted phones
    csv_file = OUTPUT_DIR / f"sms-pixel-{timestamp}.csv"
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Batch', 'Name', 'Phone (Formatted)', 'Phone (Original)', 'SMS Link', 'Sent'])
        
        for batch_num, batch in enumerate(batches, 1):
            for lead in batch:
                name = f"{lead['first_name']} {lead['last_name']}".strip()
                phone_original = lead['phone']
                phone_formatted = format_phone_for_sms(phone_original)
                sms_link = create_sms_link(phone_original, SMS_TEMPLATE)
                
                writer.writerow([
                    batch_num,
                    name,
                    phone_formatted,
                    phone_original,
                    sms_link,
                    ''  # Empty column to mark as sent
                ])
    
    print(f"✅ CSV exported: {csv_file}")
    
    # Export 2: HTML with click-to-send buttons
    html_file = OUTPUT_DIR / f"sms-pixel-{timestamp}.html"
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write("""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amens - SMS Pixel</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #10B981; }
        .batch { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 6px; }
        .batch h2 { color: #374151; font-size: 18px; margin-bottom: 10px; }
        .lead { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e5e7eb; }
        .lead:last-child { border-bottom: none; }
        .lead-info { flex: 1; }
        .lead-name { font-weight: bold; color: #111827; }
        .lead-phone { color: #6B7280; font-size: 14px; }
        .send-btn { background: #10B981; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500; }
        .send-btn:hover { background: #059669; }
        .stats { background: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        .stat { display: inline-block; margin-right: 20px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #10B981; }
        .stat-label { color: #6B7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 Amens - SMS Campaign</h1>
        <p>Click buttons to send SMS from your Google Pixel</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">""" + str(len(leads_with_phones)) + """</div>
                <div class="stat-label">Total SMS</div>
            </div>
            <div class="stat">
                <div class="stat-value">""" + str(len(batches)) + """</div>
                <div class="stat-label">Batches</div>
            </div>
            <div class="stat">
                <div class="stat-value">""" + str(batch_size) + """</div>
                <div class="stat-label">Per Batch</div>
            </div>
        </div>
""")
        
        for batch_num, batch in enumerate(batches, 1):
            f.write(f"""
        <div class="batch">
            <h2>📦 Batch {batch_num}/{len(batches)}</h2>
""")
            
            for lead in batch:
                name = f"{lead['first_name']} {lead['last_name']}".strip()
                phone = format_phone_for_sms(lead['phone'])
                sms_link = create_sms_link(lead['phone'], SMS_TEMPLATE)
                
                f.write(f"""
            <div class="lead">
                <div class="lead-info">
                    <div class="lead-name">{name}</div>
                    <div class="lead-phone">{phone}</div>
                </div>
                <a href="{sms_link}" class="send-btn">📤 Send SMS</a>
            </div>
""")
            
            f.write("""
        </div>
""")
        
        f.write("""
    </div>
</body>
</html>
""")
    
    print(f"✅ HTML exported: {html_file}")
    
    # Export 3: Simple text list for copy-paste
    txt_file = OUTPUT_DIR / f"sms-pixel-{timestamp}-phones.txt"
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write("# Phone numbers for SMS campaign\n")
        f.write(f"# Generated: {timestamp}\n")
        f.write(f"# Total: {len(leads_with_phones)}\n\n")
        
        for i, lead in enumerate(leads_with_phones, 1):
            name = f"{lead['first_name']} {lead['last_name']}".strip()
            phone = format_phone_for_sms(lead['phone'])
            f.write(f"{i}. {name}: {phone}\n")
    
    print(f"✅ Text list exported: {txt_file}")
    
    # Export 4: SMS template
    template_file = OUTPUT_DIR / f"sms-template-{timestamp}.txt"
    with open(template_file, 'w', encoding='utf-8') as f:
        f.write("# SMS Template for Amens Campaign\n\n")
        f.write(SMS_TEMPLATE)
        f.write(f"\n\n# Character count: {len(SMS_TEMPLATE)}\n")
        f.write(f"# SMS count: {(len(SMS_TEMPLATE) // 160) + 1}\n")
    
    print(f"✅ SMS template exported: {template_file}")
    
    print("\n" + "=" * 60)
    print("📱 HOW TO USE WITH GOOGLE PIXEL")
    print("=" * 60)
    print("""
OPTION 1: HTML Interface (Recommended)
1. Open the HTML file on your Pixel
2. Click "Send SMS" button for each lead
3. SMS app opens with message pre-filled
4. Send and move to next

OPTION 2: CSV Import
1. Copy phone numbers from CSV
2. Paste into SMS app
3. Use template message

OPTION 3: Text List
1. Open phones.txt
2. Copy/paste numbers to SMS app
3. Send in batches of 50

TIPS:
- Send 50 SMS max per batch
- Wait 2-3 min between batches
- Track responses in AgentCRM
- Mark sent leads in CSV
""")
    
    return {
        'csv': csv_file,
        'html': html_file,
        'txt': txt_file,
        'template': template_file,
        'total_leads': len(leads_with_phones),
        'batches': len(batches)
    }

def main():
    print("=" * 60)
    print("📱 AMENS - SMS EXPORT FOR GOOGLE PIXEL")
    print("=" * 60)
    print("Export leads optimized for SMS sending from your Pixel")
    print("=" * 60)
    
    # Get leads
    print("\n📥 Fetching leads from AgentCRM...")
    leads = get_leads_with_phones(limit=200)
    
    if not leads:
        print("❌ No leads found in AgentCRM")
        print("\n💡 Run quadrillage first:")
        print("   python3 scripts/google-maps-quadrillage.py \"coach sportif\" \"Paris\"")
        return
    
    # Export for Pixel
    print("\n📤 Exporting for Google Pixel...")
    result = export_for_pixel(leads, batch_size=50)
    
    print("\n" + "=" * 60)
    print("✅ EXPORT COMPLETE!")
    print("=" * 60)
    print(f"\n📊 Summary:")
    print(f"   Total leads: {result['total_leads']}")
    print(f"   Batches: {result['batches']} (50 SMS each)")
    print(f"\n📁 Files:")
    print(f"   {result['html']} (Click-to-send interface)")
    print(f"   {result['csv']} (Spreadsheet)")
    print(f"   {result['txt']} (Phone list)")
    print(f"   {result['template']} (SMS template)")
    print(f"\n🚀 Next:")
    print(f"   1. Open HTML file on your Google Pixel")
    print(f"   2. Click 'Send SMS' for each lead")
    print(f"   3. Track responses in AgentCRM")

if __name__ == "__main__":
    main()
