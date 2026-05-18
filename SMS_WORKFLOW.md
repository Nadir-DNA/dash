# 🗺️➡️📱 Amens - Full Automation Workflow

**Google Maps Scraper → SMS Outreach → Conversions**

---

## 🚀 Complete Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. AUTO-SCRAPER (Google Maps)                          │
│     python3 scripts/auto-scraper.py                     │
│                                                         │
│     ↓ Scrapes 300-500 coaches                           │
│     ↓ Gets: name, phone, address, website               │
│     ↓ Imports to AgentCRM                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  2. SMS OUTREACH (Brevo)                                │
│     python3 scripts/sms-outreach.py                     │
│                                                         │
│     ↓ Sends 50 SMS/day                                  │
│     ↓ Personalized messages                             │
│     ↓ Auto-updates stage to "contacted"                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  3. RESPONSE TRACKING                                   │
│     python3 scripts/track-sms-responses.py              │
│                                                         │
│     ↓ Checks Brevo for replies                          │
│     ↓ Updates stage to "interested"                     │
│     ↓ Notifies you of hot leads                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  4. FOLLOW-UP SMS (J+3, J+7)                            │
│     python3 scripts/sms-followup.py                     │
│                                                         │
│     ↓ Auto follow-up for non-responders                 │
│     ↓ Different templates per stage                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Expected Results

| Stage | Conversion Rate | Expected |
|-------|----------------|----------|
| **Leads scraped** | - | 300-500 |
| **SMS sent** | 100% | 300-500 |
| **Responses** | 10-20% | 30-100 |
| **Interested** | 5-10% | 15-50 |
| **Inscrits** | 2-5% | 6-25 |

---

## 🛠 Installation

```bash
cd ~/projects/agentcrm

# Install dependencies
pip install playwright python-dotenv requests

# Install browser
playwright install chromium

# Configure Brevo (get API key from https://app.brevo.com/settings/keys/api)
echo "BREVO_API_KEY=your-key-here" >> .env
```

---

## 📅 Daily Routine (5 min)

### Morning (9 AM)

```bash
# 1. Scrape new leads (optional, 1x/week is enough)
python3 scripts/auto-scraper.py

# 2. Send SMS outreach
python3 scripts/sms-outreach.py
```

### Afternoon (2 PM)

```bash
# 3. Check responses
python3 scripts/track-sms-responses.py
```

### Weekly (Monday)

```bash
# 4. Send follow-ups
python3 scripts/sms-followup.py
```

---

## 📱 SMS Templates

### Initial SMS
```
Bonjour {name}, c'est l'équipe Amens. On aide les coachs à 
remplir leur planning avec des clients prêts à réserver. 
Intéressé pour en savoir plus? Répondez OUI
```

### Follow-up J+3
```
Bonjour {name}, petit rappel d'Amens. On a aidé Thomas (Paris) 
à avoir 47 réservations ce mois-ci. Dispo pour un appel de 5 min?
```

### Follow-up J+7
```
Bonjour {name}, dernier message d'Amens. Si le remplissage 
de planning n'est pas un sujet, je vous souhaite beaucoup 
de succès!
```

---

## 💰 Costs

| Service | Cost | For |
|---------|------|-----|
| **Brevo SMS** | ~0.05€/SMS | 500 SMS = 25€/month |
| **Google Maps Scraper** | Free | Unlimited |
| **AgentCRM** | Free | Self-hosted |

**Total:** ~25€/month for 500 SMS

---

## ⚠️ Legal Compliance

### France SMS Regulations

- ✅ Must include opt-out option
- ✅ Only send during business hours (9h-20h)
- ✅ Respect "STOP SMS" requests
- ✅ Identify your company clearly

### Brevo Compliance

- ✅ Brevo handles opt-outs automatically
- ✅ Respects French regulations
- ✅ Delivery reports available

---

## 📈 KPIs to Track

| KPI | Target | How to Track |
|-----|--------|--------------|
| **SMS sent/day** | 50 | SMS outreach report |
| **Response rate** | 10-20% | Track responses script |
| **Conversion to interested** | 5-10% | AgentCRM dashboard |
| **Conversion to inscrit** | 2-5% | AgentCRM dashboard |
| **Cost per inscrit** | <10€ | Brevo dashboard |

---

## 🔧 Troubleshooting

### "BREVO_API_KEY not configured"

1. Go to https://app.brevo.com/settings/keys/api
2. Create new API key
3. Add to `.env`:
   ```bash
   BREVO_API_KEY=your-key-here
   ```

### "No leads ready for SMS"

Run scraper first:
```bash
python3 scripts/auto-scraper.py
```

### "SMS not delivered"

Check:
- Phone number format (must be +33...)
- Brevo account balance
- Brevo sender name approved

---

## 🎯 Success Tips

1. **Personalize SMS** - Use first name
2. **Keep it short** - Under 160 characters
3. **Clear CTA** - "Répondez OUI"
4. **Social proof** - Mention other coaches
5. **Follow up** - Most conversions at J+3 or J+7
6. **Track everything** - Use AgentCRM dashboard

---

*Full automation workflow for Amens lead generation via SMS*
