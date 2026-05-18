#!/usr/bin/env python3
"""
Re-import all CSV files that failed due to the cron bug
"""

import subprocess
import sys
from pathlib import Path

# CSV files to re-import (from cron runs that failed)
csv_files = [
    # Bordeaux - failed imports from cron
    "scraped-leads/instant-scrape-kinésithérapeute-bordeaux-2026-04-01-1203.csv",
    "scraped-leads/instant-scrape-ostéopathe-bordeaux-2026-04-01-1403.csv",
    "scraped-leads/instant-scrape-nutritionniste-bordeaux-2026-04-01-1603.csv",
    "scraped-leads/instant-scrape-naturopathe-bordeaux-2026-04-01-1803.csv",
    "scraped-leads/instant-scrape-psychologue-bordeaux-2026-04-01-2003.csv",
    "scraped-leads/instant-scrape-diététicien-bordeaux-2026-04-01-2203.csv",
    
    # Lyon & Paris - check if imported
    "scraped-leads/instant-scrape-coach-sportif-lyon-2026-04-01-0140.csv",
    "scraped-leads/instant-scrape-coach-sportif-paris-2026-04-01-0116.csv",
]

base_dir = Path.home() / "projects" / "agentcrm"
import_script = base_dir / "scripts" / "import-csv-to-agentcrm.py"

total_imported = 0
total_duplicates = 0

print("=" * 60)
print("🔄 RE-IMPORTING FAILED CSV FILES")
print("=" * 60)

for csv_file in csv_files:
    full_path = base_dir / csv_file
    
    if not full_path.exists():
        print(f"\n⚠️  File not found: {csv_file}")
        continue
    
    print(f"\n📄 Importing: {csv_file}")
    print("-" * 60)
    
    result = subprocess.run(
        ["python3", str(import_script), str(full_path)],
        capture_output=True,
        text=True
    )
    
    # Parse output for imported/duplicates
    output = result.stdout + result.stderr
    for line in output.split('\n'):
        if '✅ Imported:' in line:
            print(line)
            try:
                count = int(line.split(':')[1].strip().split()[0])
                total_imported += count
            except:
                pass
        if '⚠️  Duplicates:' in line:
            print(line)
            try:
                count = int(line.split(':')[1].strip().split()[0])
                total_duplicates += count
            except:
                pass
    
    if result.returncode != 0:
        print(f"❌ Error: {result.stderr[:200]}")

print("\n" + "=" * 60)
print("✅ RE-IMPORT COMPLETE!")
print("=" * 60)
print(f"\n📊 Total imported: {total_imported}")
print(f"⚠️  Total duplicates: {total_duplicates}")
print("=" * 60)
