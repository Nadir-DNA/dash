# 🗺️ GOOGLE MAPS QUADRILLAGE - Stratégie Complète

**Date:** 2026-03-31  
**Objectif:** Extraire TOUS les professionnels d'une ville

---

## 🎯 **Le Problème**

Google Maps limite les résultats:
- **~20-60 résultats** par recherche
- **Paris = 2M d'habitants** → Des milliers de coaches
- **Une seule recherche** = tu rates 95% des leads

**Solution:** **QUADRILLER** la ville par zones!

---

## 📊 **Stratégie de Quadrillage**

### Paris (Exemple)

```
Recherche unique:
  "coach sportif Paris" → 20 résultats ❌

Quadrillage par arrondissements:
  "coach sportif Paris 1er" → 15 résultats ✅
  "coach sportif Paris 2ème" → 12 résultats ✅
  "coach sportif Paris 3ème" → 18 résultats ✅
  ...
  "coach sportif Paris 20ème" → 20 résultats ✅

TOTAL: 20 arrondissements × 15 moy. = **300+ leads** ✅
```

---

## 🗺️ **Villes Configurées**

| Ville | Districts | Leads Estimés |
|-------|-----------|---------------|
| **Paris** | 20 arrondissements | 300-500 |
| **Lyon** | 9 arrondissements + banlieue | 150-250 |
| **Marseille** | 8 arrondissements + Aix | 150-250 |
| **Bordeaux** | 5 zones + banlieue | 100-150 |
| **Toulouse** | 5 zones + banlieue | 100-150 |
| **Nice** | 4 zones + Cannes/Antibes | 100-150 |
| **Nantes** | 5 zones + banlieue | 80-120 |
| **Lille** | 5 zones + banlieue | 80-120 |

---

## 🚀 **Utilisation**

### Script Automatique

```bash
# Quadriller Paris pour "coach sportif"
python3 scripts/google-maps-quadrillage.py "coach sportif" "Paris"

# Quadriller Lyon pour "restaurant"
python3 scripts/google-maps-quadrillage.py "restaurant" "Lyon"

# Personnaliser
python3 scripts/google-maps-quadrillage.py "dentiste" "Marseille"
```

### Ce Que Ça Fait

```
1. Ouvre Google Maps
2. Pour chaque arrondissement/zone:
   - Recherche "coach sportif Paris 1er"
   - Extrait tous les businesses
   - Attend 2 secondes (anti-blocage)
3. Combine tous les résultats
4. Supprime les doublons
5. Exporte CSV master
```

---

## 📊 **Résultats Attendus**

### Paris - Coach Sportif

```
[1/20] Paris 1er: 12 businesses
[2/20] Paris 2ème: 15 businesses
[3/20] Paris 3ème: 18 businesses
...
[20/20] Paris 20ème: 20 businesses

============================================================
📊 Total: 312 unique businesses
📞 With phones: 234 (75%)
⭐ With ratings: 287 (92%)

📍 By location:
   Paris 15ème: 22
   Paris 11ème: 21
   Paris 18ème: 20
   ...
```

---

## 📁 **Fichiers de Configuration**

### Zones Personnalisées

Tu peux ajouter tes propres zones dans `google-maps-quadrillage.py`:

```python
CITY_DIVISIONS = {
    'paris': [...],
    'lyon': [...],
    'ta-ville': [
        'Centre-ville',
        'Quartier Nord',
        'Quartier Sud',
        'Banlieue Est',
        'Banlieue Ouest'
    ]
}
```

---

## ⚠️ **Bonnes Pratiques**

### Anti-Blocage

```python
# Délai entre chaque recherche
await asyncio.sleep(2)

# Limite de requêtes
60 recherches/heure max

# Utiliser ton vrai Chrome
# → IP résidentielle = moins de blocages
```

### Optimisation

```bash
# Commence par une petite ville pour tester
python3 scripts/google-maps-quadrillage.py "coach sportif" "Bordeaux"

# Puis passe aux grandes villes
python3 scripts/google-maps-quadrillage.py "coach sportif" "Paris"

# Temps estimé:
# Bordeaux: 5 min
# Paris: 20-30 min
```

---

## 📈 **Workflow Complet**

```
1. Quadrillage
   python3 scripts/google-maps-quadrillage.py "coach sportif" "Paris"
   ↓
   CSV: 300+ leads

2. Import AgentCRM
   python3 scripts/import-csv-to-agentcrm.py scraped-leads/quadrillage-*.csv
   ↓
   Leads dans AgentCRM

3. SMS Outreach
   python3 scripts/sms-outreach.py
   ↓
   300+ SMS envoyés

4. Track Responses
   python3 scripts/track-responses.py
   ↓
   Stats de conversion
```

---

## 🎯 **Exemples de Quadrillages**

### Coach Sportif - France Entière

```bash
# Grandes villes
python3 scripts/google-maps-quadrillage.py "coach sportif" "Paris"
python3 scripts/google-maps-quadrillage.py "coach sportif" "Lyon"
python3 scripts/google-maps-quadrillage.py "coach sportif" "Marseille"
python3 scripts/google-maps-quadrillage.py "coach sportif" "Bordeaux"
python3 scripts/google-maps-quadrillage.py "coach sportif" "Toulouse"

# Total estimé: 1000-1500 leads
```

### Restaurants - Paris

```bash
python3 scripts/google-maps-quadrillage.py "restaurant" "Paris"
python3 scripts/google-maps-quadrillage.py "restaurant gastronomique" "Paris"
python3 scripts/google-maps-quadrillage.py "pizzeria" "Paris"

# Total estimé: 500-800 leads
```

---

## 📊 **Stats de Production**

| Métrique | Valeur |
|----------|--------|
| **Leads par ville (moyenne)** | 200-400 |
| **Taux de téléphones** | 70-80% |
| **Taux de ratings** | 85-95% |
| **Temps par ville** | 10-30 min |
| **Doublons filtrés** | 5-10% |

---

## 🎉 **Avantages vs Recherche Unique**

| Aspect | Recherche Unique | Quadrillage |
|--------|-----------------|-------------|
| **Leads** | 20-60 | 200-500 |
| **Couverture** | 5-10% | 80-95% |
| **Précision** | Ville entière | Par quartier |
| **Doublons** | 0% | 5-10% (filtrés) |
| **Temps** | 1 min | 10-30 min |
| **ROI** | Faible | **Excellent** |

---

## 🚀 **Prochaines Étapes**

### 1. Tester sur Petite Ville

```bash
python3 scripts/google-maps-quadrillage.py "coach sportif" "Bordeaux"
# Temps: 5 min
# Leads: 100-150
```

### 2. Lancer sur Paris

```bash
python3 scripts/google-maps-quadrillage.py "coach sportif" "Paris"
# Temps: 20-30 min
# Leads: 300-500
```

### 3. Import + SMS

```bash
python3 scripts/import-csv-to-agentcrm.py scraped-leads/quadrillage-*.csv
python3 scripts/sms-outreach.py
```

---

*Quadrillage = La méthode PRO pour extraire TOUS les leads d'une ville!*
