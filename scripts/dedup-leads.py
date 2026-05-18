
import csv, os, glob
from collections import Counter

leads_dir = os.path.expanduser("~/projects/agentcrm/scraped-leads")
output = os.path.expanduser("~/projects/agentcrm/scraped-leads/ALL-LEADS-DEDUPED.csv")

all_leads = []
for f in sorted(glob.glob(os.path.join(leads_dir, "*.csv"))):
    if "DEDUPED" in f or "CLEANED" in f:
        continue
    try:
        with open(f, "r", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                row["_source"] = os.path.basename(f)
                all_leads.append(row)
    except:
        pass

print(f"Total brut: {len(all_leads)}")

# Dedup by phone (priorité) puis nom
seen_phones = set()
seen_names = set()
deduped = []

for l in all_leads:
    name = l.get("name", "").strip().lower()
    phone = l.get("phone", "").strip()
    
    # Skip empty names
    if not name:
        continue
    
    key = phone if phone else name
    
    if phone and phone in seen_phones:
        continue
    if not phone and name in seen_names:
        continue
    
    if phone:
        seen_phones.add(phone)
    seen_names.add(name)
    deduped.append(l)

print(f"Après dédoublonnage: {len(deduped)}")
print(f"  Avec téléphone: {sum(1 for l in deduped if l.get('phone','').strip())}")
print(f"  Sans téléphone: {sum(1 for l in deduped if not l.get('phone','').strip())}")

# Write deduped CSV
if deduped:
    cols = ["name", "phone", "rating", "location", "query", "_source"]
    with open(output, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(deduped)
    print(f"\nSauvegardé: {output}")
