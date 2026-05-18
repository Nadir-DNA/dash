# 📋 Chrome Profile Setup - Status Report

**Date:** 2026-03-31 20:15  
**Status:** ⚠️ Needs Manual Step

---

## ✅ What's Done

| Step | Status | Details |
|------|--------|---------|
| Plugin installed | ✅ | `hermes-plugin-chrome-profiles` |
| Config created | ✅ | `~/.hermes/plugins/chrome-profiles/config.yaml` |
| Chrome path found | ✅ | `/opt/google/chrome/chrome` |
| Chrome version | ✅ | Google Chrome 145.0.7632.116 |

---

## ❌ What's Blocked

**Problem:** Chrome needs to be restarted with `--remote-debugging-port=9222`

**Why blocked:** Terminal security requires YOUR approval to kill Chrome processes.

---

## 🚀 What YOU Need to Do (2 min)

### Step 1: Close Chrome Completely

```bash
pkill -9 chrome
```

### Step 2: Restart Chrome with Debugging

```bash
google-chrome-stable \
  --remote-debugging-port=9222 \
  --user-data-dir=/home/nadir/.config/google-chrome &
```

### Step 3: Verify It's Working

```bash
curl http://127.0.0.1:9222/json/version
```

You should see JSON output with Chrome version info.

### Step 4: Test in Hermes

```
> browser_profile(name="default")
> browser_navigate https://www.google.com/maps
```

Your Chrome should open/activate with ALL your extensions!

---

## 📊 Expected Results

Once connected:

| Feature | Status |
|---------|--------|
| Your Chrome extensions | ✅ Will work |
| Your Google cookies | ✅ Will work |
| No CAPTCHA | ✅ Google trusts you |
| Scraping Google Maps | ✅ 50-100 leads/city |

---

## 🛠 Alternative: Use Cloud Browser (Already Works)

The cloud browser already works - just not YOUR Chrome:

```
> browser_navigate https://www.google.com/maps
```

**But:**
- ❌ No extensions
- ❌ Google shows consent/CAPTCHA
- ❌ Less reliable for scraping

---

## 📝 Commands to Run (Copy/Paste)

```bash
# 1. Kill Chrome
pkill -9 chrome

# 2. Restart with debugging
google-chrome-stable --remote-debugging-port=9222 --user-data-dir=/home/nadir/.config/google-chrome &

# 3. Wait 5 seconds, then test
sleep 5
curl http://127.0.0.1:9222/json/version

# 4. In Hermes chat
browser_profile(name="default")
```

---

## ✅ When Done

Tell me "Chrome is running with port 9222" and I'll:
1. Test the connection
2. Navigate to Google Maps
3. Scrape coaches with YOUR browser
4. Import to AgentCRM
5. Send SMS outreach

---

*Waiting for manual Chrome restart*
