# 🌐 Amens Agent Browser (Playwright)

**Local browser with YOUR Chrome extensions**

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ~/projects/agentcrm
pip install playwright python-dotenv requests
playwright install chromium
```

### 2. Install Instant Data Scraper Extension

The browser will open, but you need to install the extension:

**Option A: Install in Playwright Browser**
1. Open Chrome normally
2. Go to Chrome Web Store
3. Install "Instant Data Scraper"
4. Extension will sync to Playwright browser

**Option B: Load Extension Manually**
```python
# Edit agent-browser.py, add to browser.new_context():
# extensions=[Path.home() / ".config" / "chromium" / "Default" / "Extensions" / "extension-id"]
```

### 3. Run Agent Browser

```bash
python3 scripts/agent-browser.py
```

---

## 📋 How It Works

```
1. Script opens browser on YOUR computer
   ↓
2. You use Instant Data Scraper extension
   ↓
3. Scrape Google Maps leads
   ↓
4. Export CSV to ~/projects/agentcrm/scraped-leads/
   ↓
5. Script auto-detects CSV
   ↓
6. Auto-imports to AgentCRM
   ↓
7. Ready for cold outreach!
```

---

## 🎯 Usage

### Step 1: Run Script

```bash
python3 scripts/agent-browser.py
```

Browser opens with:
- Your user agent (not detected as bot)
- Extension support enabled
- Auto-import watcher running

### Step 2: Scrape Leads

1. Browser opens to Google Maps
2. Click Instant Data Scraper extension
3. Search "coach sportif Paris"
4. Click "Start crawling"
5. Export CSV

### Step 3: Save CSV

Save to: `~/projects/agentcrm/scraped-leads/coaches-paris.csv`

Script will auto-detect and import!

### Step 4: Watch Import

```
📄 New CSV detected: coaches-paris.csv
   Importing to AgentCRM...
   ✅ Thomas Dubois (thomas.coach@gmail.com)
   ✅ Julie Martin (julie.yoga@gmail.com)
   ...
   
📊 Import Summary:
   Imported: 47
   Duplicates: 0
   Failed: 0
```

---

## 📁 CSV Format

Instant Data Scraper exports this format:

```csv
Name,Email,Phone,Address,Rating,Reviews
"Thomas Coaching","thomas@gmail.com","+33612345678","Paris","4.8","127 reviews"
```

Script auto-maps columns to AgentCRM fields.

---

## 🔧 Advanced Configuration

### Change Import Directory

```python
# In agent-browser.py
scraped_dir = Path.home() / "projects" / "agentcrm" / "scraped-leads"
# Change to your preferred directory
```

### Auto-Navigate to Google Maps

Script already does this! It opens directly to:
```
https://www.google.com/maps
```

### Multiple CSV Files

Script watches continuously and imports each new CSV automatically.

---

## ⚠️ Troubleshooting

### "Playwright not installed"

```bash
pip install playwright
playwright install chromium
```

### "Extension not working"

Extensions need to be installed in the Chromium browser Playwright uses:

1. Find extension ID:
   - Open Chrome → chrome://extensions/
   - Enable "Developer mode"
   - Copy extension ID (e.g., `aifghphppnkdmkijoonimmkigdcnjccn`)

2. Load in Playwright:
   ```python
   context = browser.new_context(
       args=[f'--disable-extensions-except=/path/to/extension',
             f'--load-extension=/path/to/extension']
   )
   ```

### "CSV not detected"

Make sure you save to:
```
~/projects/agentcrm/scraped-leads/
```

Script only watches this directory.

---

## 📊 Expected Workflow Time

| Task | Time |
|------|------|
| Install dependencies | 2 min |
| Install extension | 1 min |
| Scrape 1 city | 3-5 min |
| Import to AgentCRM | Automatic (5 sec) |
| **Total per city** | **5-7 min** |

---

## 🎯 Next Steps After Import

```bash
# 1. Check AgentCRM dashboard
open ~/projects/agentcrm/dashboard-html/index.html

# 2. Send cold emails
python3 scripts/send-cold-outreach.py

# 3. Track responses
python3 scripts/track-email-responses.py
```

---

*Local browser automation for Amens lead scraping*
