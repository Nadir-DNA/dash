# 🗺️ Amens Auto-Scraper - Google Maps

**100% Automated Google Maps Scraper - Runs LOCALLY on your machine**

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ~/projects/agentcrm
pip install playwright python-dotenv requests
playwright install chromium
```

### 2. Run Scraper

```bash
python3 scripts/auto-scraper.py
```

### 3. Watch It Work

Browser opens → Scrapes Google Maps → Imports to AgentCRM → Done!

---

## 📊 What It Does

```
1. Opens browser on YOUR machine (your IP, your cookies)
   ↓
2. Searches Google Maps for coaches
   ↓
3. Scrapes: name, phone, address, website, ratings
   ↓
4. Saves CSV to ~/projects/agentcrm/scraped-leads/
   ↓
5. Auto-imports to AgentCRM
   ↓
6. Ready for cold outreach!
```

---

## ⚙️ Configuration

Edit `scripts/auto-scraper.py`:

```python
# Cities to scrape
CITIES = ["Paris", "Lyon", "Bordeaux", ...]

# Search queries
SEARCH_QUERIES = ["coach sportif", "personal trainer", ...]

# Auto-import to AgentCRM
AGENTCRM_IMPORT = True  # Set to False to skip import
```

---

## 📁 Output

### CSV Files

Location: `~/projects/agentcrm/scraped-leads/`

```csv
name,rating,reviews,address,type,phone,website,google_maps_url,scraped_at
"Thomas Coaching",4.8,"127 reviews","Paris","Gym","+33612345678","https://...","https://maps...","2026-03-31T..."
```

### AgentCRM Import

Leads imported with:
- **Stage:** `new`
- **Source:** `google_maps_auto_scraper`
- **Tags:** [city, specialty]
- **Notes:** Address, website, Google Maps URL

---

## ⏱️ Expected Time

| Scope | Cities | Queries | Time | Leads |
|-------|--------|---------|------|-------|
| **Test** | 1 | 1 | 30 sec | 5-15 |
| **Small** | 3 | 3 | 5 min | 50-100 |
| **Medium** | 5 | 4 | 10 min | 150-250 |
| **Full** | 8 | 4 | 20 min | 300-500 |

---

## ⚠️ Important Notes

### Rate Limiting

Script waits 3 seconds between searches to avoid Google blocks.

### Anti-Detection

Script uses:
- Real user agent
- Local IP (residential)
- Your browser cookies
- Anti-detection scripts

### Google Maps Limitations

- ❌ No emails (Google doesn't show them)
- ✅ Phone numbers
- ✅ Websites
- ✅ Addresses
- ✅ Ratings & reviews

### Finding Emails

After scraping, find emails with:
1. **Manual:** Visit websites, find contact pages
2. **Hunter.io:** API for email finding
3. **Scraping:** Scrape websites directly

---

## 🔄 Cron Job (Daily Auto-Scrape)

```bash
# Edit crontab
crontab -e

# Add daily scrape at 9 AM
0 9 * * 1-5 cd ~/projects/agentcrm && python3 scripts/auto-scraper.py
```

---

## 🛠 Troubleshooting

### "Playwright not installed"

```bash
pip install playwright
playwright install chromium
```

### "Browser won't open"

Make sure you have a display (not running on headless server).

### "Google blocks requests"

- Increase sleep time (line 103)
- Reduce number of cities/queries
- Use residential proxy

### "No results found"

Google may have changed selectors. Update the JavaScript in `scrape_google_maps()` function.

---

## 📈 Expected Results

| City | Leads/Query | Total (4 queries) |
|------|-------------|-------------------|
| Paris | 15-25 | 60-100 |
| Lyon | 10-20 | 40-80 |
| Bordeaux | 10-20 | 40-80 |
| Marseille | 10-20 | 40-80 |
| **Total (8 cities)** | - | **300-500 leads** |

---

## 🎯 Next Steps After Scrape

```bash
# 1. Check AgentCRM dashboard
open ~/projects/agentcrm/dashboard-html/index.html

# 2. Find emails (manual or Hunter.io)
# Edit leads in AgentCRM to add emails

# 3. Send cold emails
python3 scripts/send-cold-outreach.py

# 4. Track responses
python3 scripts/track-email-responses.py
```

---

*Automated Google Maps scraping for Amens lead generation*
