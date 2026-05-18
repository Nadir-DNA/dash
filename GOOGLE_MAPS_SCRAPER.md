# 🗺️ Amens - Google Maps Lead Scraper

**Fully automated lead scraping from Google Maps**

Replaces: Manual Instant Data Scraper Chrome extension

---

## 🚀 Quick Start

### Option 1: Simple Scraper (Python, Simulated)

```bash
cd ~/projects/agentcrm
python3 scripts/google-maps-scraper.py
```

**Output:**
- Scrapes 8 cities × 3 queries = 24 searches
- Imports directly to AgentCRM
- Report saved to `reports/`

### Option 2: Real Scraper (Node.js + Puppeteer)

```bash
# Install dependencies
cd ~/projects/agentcrm
npm install puppeteer

# Run scraper
node scripts/google-maps-scraper-real.js "Paris" "coach sportif"
```

**Output:**
- CSV files in `scraped-leads/`
- JSON file with all leads
- Ready to import to AgentCRM

---

## 📊 Features

| Feature | Simple Scraper | Real Scraper |
|---------|---------------|--------------|
| **Speed** | Fast | Slower (real browser) |
| **Accuracy** | Simulated data | Real Google Maps data |
| **Setup** | None | Puppeteer required |
| **Google blocks** | N/A | Possible (use proxies) |
| **Best for** | Testing | Production |

---

## 🔧 Configuration

### Edit Cities

```python
# In google-maps-scraper.py
CITIES = [
    "Paris, France",
    "Lyon, France",
    "Bordeaux, France",
    # Add your cities
]
```

### Edit Search Queries

```python
SEARCH_QUERIES = [
    "coach sportif",
    "personal trainer",
    "coach yoga",
    # Add your queries
]
```

---

## 📁 Output Files

### CSV Format
```csv
Name,Rating,Reviews,Address,Type,Google Maps URL
"Thomas Coaching",4.8,"127 reviews","Paris","Gym","https://maps.google.com/..."
```

### AgentCRM Import

Leads are automatically imported to Supabase with:
- **Stage:** `new`
- **Source:** `google_maps_scraper`
- **Tags:** [city, specialty]
- **Notes:** Google Maps URL

---

## ⚠️ Important Notes

### Google Maps Scraping

1. **Rate Limiting:** Wait 3-5 seconds between requests
2. **User Agent:** Rotate user agents to avoid detection
3. **Proxies:** Use residential proxies for large-scale scraping
4. **Terms of Service:** Google may block automated scraping

### Legal Considerations

- ✅ Public business information is generally OK to scrape
- ⚠️ Don't scrape personal data
- ⚠️ Respect robots.txt
- ⚠️ Don't overload Google's servers

### Production Alternative

For production, use **Google Places API** (official, paid):

```python
import googlemaps

gmaps = googlemaps.Client(key='YOUR_API_KEY')
places = gmaps.places_nearby(location=(48.8566, 2.3522), keyword='coach sportif')
```

**Cost:** ~$0.032 per request (1000 requests = $32)

---

## 🔄 Full Automation Workflow

```
1. Run scraper
   ↓
2. Leads imported to AgentCRM
   ↓
3. Cold outreach starts automatically
   ↓
4. Track responses
   ↓
5. Convert to inscrits
```

### Cron Job (Daily Scraping)

```bash
# Add to crontab
0 9 * * 1-5 cd ~/projects/agentcrm && python3 scripts/google-maps-scraper.py
```

---

## 📈 Expected Results

| City | Leads/Search | Total (3 queries) |
|------|--------------|-------------------|
| Paris | 10-20 | 30-60 |
| Lyon | 5-15 | 15-45 |
| Bordeaux | 5-15 | 15-45 |
| **Total (8 cities)** | - | **200-400 leads** |

---

## 🛠 Troubleshooting

### "No results found"
- Google may be blocking automated requests
- Try using Puppeteer with headful mode
- Use Google Places API instead

### "Too many requests"
- Increase sleep time between requests
- Use proxies
- Reduce number of cities/queries

### "Puppeteer won't launch"
```bash
# Install dependencies
sudo apt-get install -y chromium-browser
```

---

## 🚀 Next Steps

1. **Test simple scraper:**
   ```bash
   python3 scripts/google-maps-scraper.py
   ```

2. **Check AgentCRM:**
   - Open dashboard
   - Verify leads imported

3. **Start outreach:**
   ```bash
   python3 scripts/send-cold-outreach.py
   ```

---

*Automated lead scraping for Amens*
