import csv, os, glob
from collections import Counter

leads_dir = os.path.expanduser("~/projects/agentcrm/scraped-leads")
all_leads = []

for f in sorted(glob.glob(os.path.join(leads_dir, "*.csv"))):
    try:
        with open(f, 'r', encoding='utf-8') as fh:
            reader = csv.DictReader(fh)
            rows = list(reader)
            for row in rows:
                row["_source"] = os.path.basename(f)
                all_leads.append(row)
    except:
        pass

print(f"=== AUDIT LEADS ===")
print(f"Fichiers: {len(glob.glob(os.path.join(leads_dir, '*.csv')))}")
print(f"Lignes totales: {len(all_leads)}")

phones = []
names = []
for l in all_leads:
    name = l.get("Name", l.get("name", l.get("Nom", ""))).strip()
    phone = l.get("Phone", l.get("phone", l.get("Téléphone", l.get("telephone", "")))).strip()
    names.append(name)
    phones.append(phone)

unique_names = len(set(n.lower() for n in names if n))
unique_phones = len(set(p for p in phones if p))
has_phone = len([p for p in phones if p])
no_phone = len([p for p in phones if not p])

print(f"\n=== DÉDOUBLONNAGE ===")
print(f"Noms uniques: {unique_names}")
print(f"Téléphones uniques: {unique_phones}")
print(f"Avec téléphone: {has_phone}")
print(f"Sans téléphone: {no_phone}")

name_counts = Counter(n.lower() for n in names if n)
dupes = {k:v for k,v in name_counts.items() if v > 1}
print(f"Doublons noms: {len(dupes)} ({sum(dupes.values()) - len(dupes)} entrées en trop)")

phone_counts = Counter(p for p in phones if p)
phone_dupes = {k:v for k,v in phone_counts.items() if v > 1}
print(f"Doublons téléphones: {len(phone_dupes)} ({sum(phone_dupes.values()) - len(phone_dupes)} entrées en trop)")

cities = Counter()
for l in all_leads:
    src = l.get("_source", "")
    for city in ["paris", "bordeaux", "lyon", "marseille", "toulouse", "lille", "nantes", "nice"]:
        if city in src.lower():
            cities[city] += 1
            break
    else:
        cities["autre"] += 1

print(f"\n=== PAR VILLE ===")
for city, count in cities.most_common():
    print(f"  {city}: {count}")

professions = Counter()
for l in all_leads:
    src = l.get("_source", "")
    for prof in ["coach-sportif", "kinesitherapeute", "kine", "naturopathe", "dieteticien", "nutritionniste", "osteopathe", "psychologue", "preparateur"]:
        if prof in src.lower():
            professions[prof] += 1
            break
    else:
        professions["autre"] += 1

print(f"\n=== PAR PROFESSION ===")
for prof, count in professions.most_common():
    print(f"  {prof}: {count}")

if all_leads:
    cols = [k for k in all_leads[0].keys() if k != "_source"]
    print(f"\n=== COLONNES ===")
    print(cols)
