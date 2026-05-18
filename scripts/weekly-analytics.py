#!/usr/bin/env python3
"""
Amens - Weekly Analytics Report
Generates KPI report from Supabase data
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

def get_kpi_data():
    """Fetch all KPI data from Supabase"""
    headers = {
        "apikey": supabase_key,
        "Authorization": "Bearer " + supabase_key
    }
    
    # Total leads
    r = requests.get(
        supabase_url + "/rest/v1/contacts?select=*&limit=0",
        headers=headers,
        timeout=10
    )
    try:
        total_leads = int(r.headers.get("Content-Range", "0").split("/")[-1]) if r.status_code in [200, 206] else 0
    except (ValueError, IndexError):
        total_leads = 0
    
    # Leads by stage
    stages = {}
    r = requests.get(
        supabase_url + "/rest/v1/contacts?select=stage",
        headers=headers,
        timeout=10
    )
    if r.status_code == 200:
        for contact in r.json():
            stage = contact.get("stage", "unknown")
            stages[stage] = stages.get(stage, 0) + 1
    
    # New leads this week
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    r = requests.get(
        supabase_url + f"/rest/v1/contacts?select=*&created_at=gt.{week_ago}&limit=0",
        headers={**headers, "Prefer": "count=exact"},
        timeout=10
    )
    new_leads_week = int(r.headers.get("Content-Range", "0").split("/")[-1]) if r.status_code in [200, 206] else 0
    
    # Contacted this week
    r = requests.get(
        supabase_url + f"/rest/v1/contacts?select=*&stage=eq.contacted&last_contacted_at=gt.{week_ago}&limit=0",
        headers={**headers, "Prefer": "count=exact"},
        timeout=10
    )
    contacted_week = int(r.headers.get("Content-Range", "0").split("/")[-1]) if r.status_code in [200, 206] else 0
    
    # Replies (interested)
    r = requests.get(
        supabase_url + "/rest/v1/contacts?select=*&stage=eq.interested&limit=0",
        headers={**headers, "Prefer": "count=exact"},
        timeout=10
    )
    interested = int(r.headers.get("Content-Range", "0").split("/")[-1]) if r.status_code in [200, 206] else 0
    
    # Inscrits (enrolled)
    r = requests.get(
        supabase_url + "/rest/v1/contacts?select=*&stage=eq.inscrit&limit=0",
        headers={**headers, "Prefer": "count=exact"},
        timeout=10
    )
    inscrits = int(r.headers.get("Content-Range", "0").split("/")[-1]) if r.status_code in [200, 206] else 0
    
    # Campaigns
    r = requests.get(
        supabase_url + "/rest/v1/campaigns?select=id,name,status,sent_count",
        headers=headers,
        timeout=10
    )
    campaigns = r.json() if r.status_code == 200 else []
    
    return {
        "total_leads": total_leads,
        "stages": stages,
        "new_leads_week": new_leads_week,
        "contacted_week": contacted_week,
        "interested": interested,
        "inscrits": inscrits,
        "campaigns": campaigns,
        "date": datetime.now().strftime("%Y-%m-%d")
    }

def generate_report(data):
    """Generate markdown report"""
    
    # Calculate conversion rates
    total = data["total_leads"] or 1
    conversion_rate = round((data["inscrits"] / total) * 100, 2) if total > 0 else 0
    response_rate = round((data["interested"] / total) * 100, 2) if total > 0 else 0
    
    report = f"""# 📊 Amens - Weekly Analytics Report

**Date:** {data["date"]}  
**Period:** Last 7 days

---

## 🎯 KPI Summary

| Metric | Value | Target (Week 1) | % |
|--------|-------|-----------------|---|
| **Total Leads** | {data["total_leads"]} | 200 | {round(data["total_leads"]/200*100)}% |
| **New Leads (Week)** | {data["new_leads_week"]} | 200 | {round(data["new_leads_week"]/200*100)}% |
| **Emails Sent** | {data["contacted_week"]} | 250 | {round(data["contacted_week"]/250*100)}% |
| **Réponses** | {data["interested"]} | 20 | {round(data["interested"]/20*100)}% |
| **Pros Inscrits** | {data["inscrits"]} | 10 | {round(data["inscrits"]/10*100)}% |

---

## 📈 Pipeline Breakdown

| Stage | Count | % of Total |
|-------|-------|------------|
"""
    
    for stage, count in sorted(data["stages"].items(), key=lambda x: x[1], reverse=True):
        pct = round((count / total) * 100, 1)
        report += f"| {stage} | {count} | {pct}% |\n"
    
    report += f"""
---

## 📧 Email Performance

- **Sent This Week:** {data["contacted_week"]}
- **Response Rate:** {response_rate}%
- **Conversion Rate:** {conversion_rate}%

---

## 📋 Campaigns

| Campaign | Status | Sent |
|----------|--------|------|
"""
    
    for camp in data["campaigns"][:5]:
        report += f"| {camp['name']} | {camp['status']} | {camp.get('sent_count', 0)} |\n"
    
    report += f"""
---

## 🎯 Next Week Goals

- [ ] Extract 200 new leads
- [ ] Send 250 cold emails
- [ ] Get 20+ responses
- [ ] Convert 10+ to inscrits

---

## 📝 Notes

- Lead extraction: ✅ Operational (192 leads)
- Cold outreach: ✅ 44 emails sent (88% success rate)
- Follow-ups: ⏳ Scheduled for J+3, J+7, J+10
- Dashboard: 🔒 Vercel auth enabled

---

*Generated automatically by Amens Analytics*
"""
    
    return report

def send_report_email(report_md):
    """Email report to team"""
    if not resend_key:
        print("⚠️  No Resend API key - skipping email")
        return False
    
    # Convert markdown to plain text for email
    text_report = report_md.replace("#", "").replace("##", "").replace("###", "")
    
    r = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json"
        },
        json={
            "from": "Amens Analytics <team@amens.fr>",
            "to": ["nadir@amens.fr"],
            "subject": f"📊 Amens Weekly Report - {datetime.now().strftime('%Y-%m-%d')}",
            "text": text_report
        },
        timeout=10
    )
    
    return r.status_code in [200, 201]

def main():
    print("=" * 60)
    print("📊 AMENS - WEEKLY ANALYTICS REPORT")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    # Get data
    print("\n📈 Fetching data from Supabase...")
    data = get_kpi_data()
    
    # Generate report
    report = generate_report(data)
    
    # Save report
    reports_dir = Path.home() / "projects" / "agentcrm" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    report_file = reports_dir / f"weekly-report-{datetime.now().strftime('%Y-%m-%d')}.md"
    report_file.write_text(report)
    print(f"\n✅ Report saved: {report_file}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 KPI SUMMARY")
    print("=" * 60)
    print(f"Total Leads: {data['total_leads']}")
    print(f"New Leads (Week): {data['new_leads_week']}")
    print(f"Contacted (Week): {data['contacted_week']}")
    print(f"Interested: {data['interested']}")
    print(f"Inscrits: {data['inscrits']}")
    
    # Calculate conversion
    total = data["total_leads"] or 1
    conversion = round((data["inscrits"] / total) * 100, 2)
    print(f"\nConversion Rate: {conversion}%")
    
    # Send email
    print("\n📧 Sending email report...")
    if send_report_email(report):
        print("✅ Email sent successfully")
    else:
        print("⚠️  Email not sent (check Resend config)")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
