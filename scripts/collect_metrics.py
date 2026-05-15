#!/usr/bin/env python3
"""
Dash Metrics Collector
======================
Queries Supabase instances, aggregates metrics, uploads JSON to Amens Storage bucket.

Sources:
  - Amens (ntsbywucjgusewcgblhz) — bookings, professionals, users, subscriptions
  - AgentCRM (psgsylbsjbgltigqfaoh) — prospects/leads, SMS
  - FlashCert — TODO when available

Output: Uploads to https://ntsbywucjgusewcgblhz.supabase.co/storage/v1/object/public/dash/metrics.json

Usage:
  python3 collect_metrics.py           # collect + upload
  python3 collect_metrics.py --local   # save to local file only
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

# ─── Config ────────────────────────────────────────────────────────────────────

AMENS_URL = "https://ntsbywucjgusewcgblhz.supabase.co"
AMENS_SERVICE_KEY = os.environ.get("AMENS_SERVICE_KEY", "")

AGENTCRM_URL = "https://psgsylbsjbgltigqfaoh.supabase.co"
AGENTCRM_SERVICE_KEY = os.environ.get("AGENTCRM_SERVICE_KEY", "")

STORAGE_BUCKET = "dash"
STORAGE_PATH = "metrics.json"

OUTPUT_LOCAL = os.path.expanduser("~/dash/public/metrics.json")

# ─── Helpers ───────────────────────────────────────────────────────────────────

def supabase_count(url: str, key: str, table: str, filter_col: str = None, filter_val: str = None) -> int:
    """Count rows in a Supabase table, optionally filtered."""
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Prefer": "count=exact",
    }
    query = f"{url}/rest/v1/{table}?select=count&limit=0"
    if filter_col and filter_val:
        query += f"&{filter_col}=eq.{filter_val}"

    req = urllib.request.Request(query, headers=headers, method="HEAD")
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        content_range = resp.getheader("content-range", "")
        # Format: "*/N" or "0-0/N"
        if "/" in content_range:
            return int(content_range.split("/")[-1])
        return 0
    except Exception as e:
        print(f"  ⚠ {table}: {e}", file=sys.stderr)
        return -1


def supabase_sum(url: str, key: str, table: str, field: str, filter_col: str = None, filter_val: str = None) -> float:
    """Sum a numeric field in a Supabase table."""
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }
    query = f"{url}/rest/v1/{table}?select={field}"
    if filter_col and filter_val:
        query += f"&{filter_col}=eq.{filter_val}"

    req = urllib.request.Request(query, headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        total = sum((r.get(field) or 0) for r in data)
        return total
    except Exception as e:
        print(f"  ⚠ sum({table}.{field}): {e}", file=sys.stderr)
        return 0


def upload_to_storage(data: dict) -> bool:
    """Upload JSON to Supabase Storage bucket."""
    url = f"{AMENS_URL}/storage/v1/object/{STORAGE_BUCKET}/{STORAGE_PATH}"
    headers = {
        "apikey": AMENS_SERVICE_KEY,
        "Authorization": f"Bearer {AMENS_SERVICE_KEY}",
        "Content-Type": "application/json",
        "x-upsert": "true",
    }
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        print(f"  ✓ Uploaded to storage ({resp.status})")
        return True
    except Exception as e:
        print(f"  ✗ Upload failed: {e}", file=sys.stderr)
        return False


# ─── Collectors ────────────────────────────────────────────────────────────────

def collect_amens() -> dict:
    """Collect Amens metrics."""
    print("[Amens] Collecting...")
    t0 = time.time()

    metrics = {
        "professionals": supabase_count(AMENS_URL, AMENS_SERVICE_KEY, "professionals"),
        "profiles": supabase_count(AMENS_URL, AMENS_SERVICE_KEY, "profiles"),
        "subscriptions_active": supabase_count(AMENS_URL, AMENS_SERVICE_KEY, "subscriptions", "status", "active"),
        "subscriptions_total": supabase_count(AMENS_URL, AMENS_SERVICE_KEY, "subscriptions"),
        "bookings_total": supabase_count(AMENS_URL, AMENS_SERVICE_KEY, "bookings"),
        "reviews_total": supabase_count(AMENS_URL, AMENS_SERVICE_KEY, "reviews"),
    }

    # MRR: sum subscription amounts
    mrr = supabase_sum(AMENS_URL, AMENS_SERVICE_KEY, "subscriptions", "amount", "status", "active")
    # If amounts are null/0, estimate at 29€/sub
    if mrr == 0:
        mrr = metrics["subscriptions_active"] * 29
    metrics["mrr"] = int(mrr)

    # Bookings today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    metrics["bookings_today"] = supabase_count(AMENS_URL, AMENS_SERVICE_KEY, "bookings", "created_at", f"gte.{today}")

    elapsed = time.time() - t0
    print(f"  Done in {elapsed:.1f}s: {json.dumps(metrics)}")
    return metrics


def collect_agentcrm() -> dict:
    """Collect AgentCRM metrics."""
    print("[AgentCRM] Collecting...")
    t0 = time.time()

    # Try known tables
    metrics = {}

    # Check which tables exist
    for table in ["prospects", "leads", "companies", "contacts"]:
        count = supabase_count(AGENTCRM_URL, AGENTCRM_SERVICE_KEY, table)
        if count >= 0:
            metrics[table] = count
        else:
            # Try singular form
            singular = table.rstrip("s")
            count2 = supabase_count(AGENTCRM_URL, AGENTCRM_SERVICE_KEY, singular)
            if count2 >= 0:
                metrics[singular] = count2

    # SMS stats
    for table in ["sms_logs", "sms_messages", "messages"]:
        count = supabase_count(AGENTCRM_URL, AGENTCRM_SERVICE_KEY, table)
        if count >= 0:
            metrics["sms_total"] = count
            break

    # If no tables found, provide empty
    if not metrics:
        metrics = {"status": "no_tables_found"}

    elapsed = time.time() - t0
    print(f"  Done in {elapsed:.1f}s: {json.dumps(metrics)}")
    return metrics


def collect_flashcert() -> dict:
    """FlashCert — not yet configured."""
    return {"status": "not_configured", "message": "FlashCert Supabase à configurer"}


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    local_only = "--local" in sys.argv

    print(f"╔══ Dash Metrics Collector ══╗")
    print(f"║ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"╠══════════════════════════════╣")

    all_metrics = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "projects": {
            "amens": collect_amens(),
            "agentcrm": collect_agentcrm(),
            "flashcert": collect_flashcert(),
        },
    }

    # Save locally
    os.makedirs(os.path.dirname(OUTPUT_LOCAL), exist_ok=True)
    with open(OUTPUT_LOCAL, "w") as f:
        json.dump(all_metrics, f, ensure_ascii=False, indent=2)
    print(f"\n✓ Saved locally: {OUTPUT_LOCAL}")

    # Upload to Supabase Storage
    if not local_only:
        success = upload_to_storage(all_metrics)
        if success:
            public_url = f"{AMENS_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{STORAGE_PATH}"
            print(f"✓ Public URL: {public_url}")
        else:
            print("✗ Upload failed — using local file only")
            sys.exit(1)

    print("╚══════════════════════════════╝")


if __name__ == "__main__":
    main()
