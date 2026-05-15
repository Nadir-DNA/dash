#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client

url = os.environ.get("SUPABASE_URL", "https://psgsylbsjbgltigqfaoh.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")

client = create_client(url, key)

print("Tables existantes:")
tables_to_check = ['profiles', 'prospects', 'dash_metrics', 'dash_projects', 'subscriptions', 'listings', 'transactions']

for table in tables_to_check:
    try:
        response = client.table(table).select("*").limit(1).execute()
        print(f"  ✓ {table} existe")
    except Exception as e:
        if "Could not find" in str(e):
            print(f"  ✗ {table} n'existe pas")
        else:
            print(f"  ? {table}: {e}")