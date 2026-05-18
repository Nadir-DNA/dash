# 🤖 Amens - Cron Jobs Automation

**Setup:** Automated email outreach and follow-ups

---

## 📅 Schedule

| Job | Schedule | Script | Purpose |
|-----|----------|--------|---------|
| **Daily Outreach** | Mon-Fri 10:00 | `send-cold-outreach.py` | Send 50 emails to new leads |
| **Follow-up J+3** | Daily 10:30 | `send-followups.py` | Follow-up for contacts contacted 3 days ago |
| **Follow-up J+7** | Daily 10:30 | `send-followups.py` | Follow-up for contacts contacted 7 days ago |
| **Follow-up J+10** | Daily 10:30 | `send-followups.py` | Breakup email for contacts contacted 10 days ago |
| **Response Tracker** | Daily 18:00 | `track-email-responses.py` | Check for replies, update stages |
| **Weekly Report** | Monday 07:00 | `weekly-report.py` | Email report with KPIs |

---

## 🔧 Setup Cron Jobs

### Option 1: System Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add these lines:
# Daily outreach (Mon-Fri 10am)
0 10 * * 1-5 cd ~/projects/agentcrm && python3 scripts/send-cold-outreach.py >> logs/outreach.log 2>&1

# Follow-ups (Daily 10:30am)
30 10 * * * cd ~/projects/agentcrm && python3 scripts/send-followups.py >> logs/followups.log 2>&1

# Response tracker (Daily 6pm)
0 18 * * * cd ~/projects/agentcrm && python3 scripts/track-email-responses.py >> logs/tracker.log 2>&1

# Weekly report (Monday 7am)
0 7 * * 1 cd ~/projects/agentcrm && python3 scripts/weekly-report.py >> logs/reports.log 2>&1
```

### Option 2: Vercel Cron (If Deployed)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/outreach",
      "schedule": "0 10 * * 1-5"
    },
    {
      "path": "/api/cron/followups",
      "schedule": "30 10 * * *"
    }
  ]
}
```

### Option 3: GitHub Actions

```yaml
# .github/workflows/outreach.yml
name: Daily Outreach

on:
  schedule:
    - cron: '0 10 * * 1-5'  # Mon-Fri 10am UTC

jobs:
  outreach:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install requests python-dotenv
      - run: python scripts/send-cold-outreach.py
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_KEY }}
          RESEND_API_KEY: ${{ secrets.RESEND_KEY }}
```

---

## 📊 Logs

All scripts log to `~/projects/agentcrm/logs/`:

```
logs/
├── outreach.log      # Daily outreach emails
├── followups.log     # Follow-up emails
├── tracker.log       # Response tracking
└── reports.log       # Weekly reports
```

View logs:
```bash
tail -f ~/projects/agentcrm/logs/outreach.log
```

---

## ✅ Verification

After setup, verify cron jobs are running:

```bash
# List cron jobs
crontab -l

# Check if scripts ran
ls -lh ~/projects/agentcrm/logs/

# Check latest outreach
tail ~/projects/agentcrm/logs/outreach.log
```

---

## 🎯 Expected Daily Activity

**Each weekday at 10:00:**
- 50 new emails sent
- ~44 successful (88% success rate)
- ~6 failures (non-ASCII emails)
- Contacts updated to "contacted" stage

**Each day at 10:30:**
- J+3 follow-ups (~10-20 emails)
- J+7 follow-ups (~5-10 emails)
- J+10 breakup emails (~2-5 emails)

**Each day at 18:00:**
- Check for replies
- Update "interested" stage for replies
- Track email opens/clicks (if webhooks configured)

---

*Setup guide for Amens automated outreach*
