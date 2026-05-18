# 🚀 WORKFLOW FINAL - Instant Data Scraper + Hermes Agent

**Date:** 2026-03-31  
**Status:** ✅ 100% Opérationnel

---

## 🎯 Workflow Optimal

```
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 1: TOI (2-5 min)                                 │
│  Instant Data Scraper Extension                         │
│                                                         │
│  1. Ouvre Chrome                                        │
│  2. Va sur Google Maps / Pages Jaunes                   │
│  3. Cherche "coach sportif Paris"                       │
│  4. Clique extension Instant Data Scraper               │
│  5. Il détecte auto → Clique "Extract"                  │
│  6. Export CSV → ~/projects/agentcrm/scraped-leads/     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 2: MOI (30 sec - AUTO)                           │
│  Hermes Agent                                           │
│                                                         │
│  Dis-moi: "CSV prêt"                                    │
│                                                         │
│  Je lance:                                              │
│  1. Import CSV → AgentCRM                               │
│     python3 scripts/import-csv-to-agentcrm.py           │
│                                                         │
│  2. Envoi SMS Brevo                                     │
│     python3 scripts/sms-outreach.py                     │
│                                                         │
│  3. Log Obsidian (auto)                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Scripts Prêts

| Script | Purpose | Status |
|--------|---------|--------|
| `import-csv-to-agentcrm.py` | Import CSV → AgentCRM | ✅ Testé |
| `sms-outreach.py` | Envoi SMS Brevo | ✅ Testé |
| `scrape-maps-standalone.py` | Scraper Google Maps | ✅ Testé |
| `track-responses.py` | Track réponses SMS | ⏳ À créer |

---

## 🛠 Instant Data Scraper (Extension)

**Lien:** https://chrome.google.com/webstore/detail/instant-data-scraper/ofaokhiedipichpaobibbnahnkdoiiah

**Pourquoi c'est mieux que mon script:**
- ✅ Détection IA heuristique
- ✅ Gère shadow DOM
- ✅ Pagination automatique
- ✅ Export CSV/Excel
- ✅ Gratuit
- ✅ Déjà installé chez toi

**Mon script ne peut PAS faire:**
- ❌ Shadow DOM access (limitations Playwright)
- ❌ IA heuristique (trop complexe)
- ❌ Pagination auto (nécessite UI)

---

## 📊 Résultats Attendus

| Source | Temps | Leads | Téléphones |
|--------|-------|-------|------------|
| **Google Maps** | 2 min | 10-20/ville | ❌ Non (à ajouter) |
| **Pages Jaunes** | 2 min | 20-50/ville | ✅ Oui |
| **LinkedIn** | 5 min | 50-100 | ⚠️ Variable |

---

## 🚀 Test Rapide (Maintenant)

### Toi (2 min):
```
1. Ouvre Chrome
2. https://www.google.com/maps/search/coach+sportif+Paris
3. Clique Instant Data Scraper
4. Clique "Extract"
5. Sauvegarde: ~/projects/agentcrm/scraped-leads/coaches.csv
```

### Moi (30 sec):
```bash
# Dis-moi juste "CSV prêt"
python3 scripts/import-csv-to-agentcrm.py scraped-leads/coaches.csv
python3 scripts/sms-outreach.py
```

---

## 💡 Astuces

### Pour avoir les téléphones:
1. **Pages Jaunes** → Téléphones inclus
2. **Google Maps** → Cliquer sur chaque fiche (lent)
3. **Google + Hunter.io** → Trouve emails
4. **Manuel** → 5 min pour 10 leads importants

### Pour scaler:
```bash
# Scraper 5 villes
python3 scripts/scrape-maps-standalone.py
# → Modifie CITIES dans le script

# Ou utilise Instant Data Scraper avec pagination
# → Clique "Next" automatiquement
```

---

## 📈 KPIs

| Métrique | Cible |
|----------|-------|
| Leads scrapés/jour | 50-100 |
| SMS envoyés/jour | 50 |
| Taux de réponse | 10-20% |
| Conversions | 3-5% |

---

*Workflow optimisé - Instant Data Scraper pour le scraping, Hermes pour l'automation*
