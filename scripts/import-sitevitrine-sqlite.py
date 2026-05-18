#!/usr/bin/env python3
"""
Import SiteVitrine leads directement dans SQLite (bypass TrailBase API).
Implémente is_uuid() pour satisfaire la contrainte CHECK.
"""

import sqlite3
import json
import uuid
import sys
from pathlib import Path

DB_PATH = Path.home() / "projects/dash/traildepot/data/main.db"
SOURCE = Path.home() / "projects/site-vitrine/crm/contacts.ndjson"

def is_uuid_fn(blob):
    """Implémente is_uuid() : vérifie que le blob fait 16 octets."""
    if blob is None:
        return 0
    return 1 if len(blob) == 16 else 0

def uuid_to_blob(u: uuid.UUID) -> bytes:
    return u.bytes

def main():
    if not DB_PATH.exists():
        print(f"❌ DB introuvable: {DB_PATH}")
        sys.exit(1)

    contacts = []
    with open(SOURCE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                contacts.append(json.loads(line))

    print(f"📋 {len(contacts)} leads à importer...")

    con = sqlite3.connect(str(DB_PATH))
    con.create_function("is_uuid", 1, is_uuid_fn)

    ok = skip = err = 0

    for c in contacts:
        new_id = uuid.uuid4()
        try:
            con.execute("""
                INSERT INTO sitevitrine_sites
                  (id, name, phone, sector, address, site_url, status, stage, source, labels, notes, google_maps_url, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                uuid_to_blob(new_id),
                (c.get("name") or c.get("company") or "")[:500],
                (c.get("phone") or "")[:50],
                (c.get("sector") or "")[:100],
                (c.get("address") or "")[:300],
                (c.get("site_url") or "")[:500],
                (c.get("site_status") or "draft")[:50],
                (c.get("stage") or "new")[:50],
                (c.get("source") or "")[:100],
                json.dumps(c.get("labels") or []),
                (c.get("notes") or "")[:1000],
                (c.get("google_maps_url") or "")[:1000],
                c.get("created_at") or "2026-03-11T23:26:18.000Z",
                c.get("created_at") or "2026-03-11T23:26:18.000Z",
            ))
            ok += 1
        except sqlite3.IntegrityError as e:
            msg = str(e)
            if "UNIQUE" in msg or "unique" in msg:
                skip += 1
            else:
                print(f"  ❌ {c.get('name', '?')}: {msg}")
                err += 1
        except Exception as e:
            print(f"  ❌ {c.get('name', '?')}: {e}")
            err += 1

    con.commit()
    con.close()

    print(f"\n✅ Import terminé:")
    print(f"   {ok} importés")
    if skip: print(f"   {skip} doublons ignorés")
    if err:  print(f"   {err} erreurs")

    # Vérification
    con2 = sqlite3.connect(str(DB_PATH))
    con2.create_function("is_uuid", 1, is_uuid_fn)
    count = con2.execute("SELECT COUNT(*) FROM sitevitrine_sites").fetchone()[0]
    con2.close()
    print(f"\n📊 Total dans sitevitrine_sites: {count}")

if __name__ == "__main__":
    main()
