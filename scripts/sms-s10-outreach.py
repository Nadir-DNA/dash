#!/usr/bin/env python3
"""
Amens SMS Outreach — via Samsung S10 ADB
==========================================
Utilise le Samsung S10 connecté en USB pour envoyer des SMS
automatiquement aux prospects AgentCRM.

Usage:
    python3 scripts/sms-s10-outreach.py              # Envoi normal
    python3 scripts/sms-s10-outreach.py --dry-run    # Simulation
    python3 scripts/sms-s10-outreach.py --all        # Ignore daily cap
"""

import subprocess
import requests
import os
import re
import time
import sys
from pathlib import Path
from datetime import datetime, date
from dotenv import load_dotenv

# ─── Config ────────────────────────────────────────────────────────
DAILY_LIMIT = 25           # SMS max par jour (safe)
DELAY_BETWEEN_SMS = 45     # Secondes entre chaque envoi
MAX_SMS_LENGTH = 160       # Un seul segment GSM
TEMPLATE_VERSION = "v1.0"
LOG_DIR = Path.home() / "projects/agentcrm" / "logs"
REPORT_DIR = Path.home() / "projects" / "agentcrm" / "reports"

SMS_TEMPLATE = (
    "Bonjour {name}, c'est l'équipe Amens. "
    "On aide les coachs à remplir leur planning avec "
    "des clients prêts à réserver. "
    "Répondez OUI pour en savoir plus."
)

# ─── Env ───────────────────────────────────────────────────────────
env_file = Path.home() / "projects" / "agentcrm" / ".env"
load_dotenv(env_file)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erreur: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis")
    sys.exit(1)


# ─── Utils ─────────────────────────────────────────────────────────
def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")

def clean_phone(phone: str) -> str:
    """Convertit 06 12 34 56 78 → +33612345678"""
    cleaned = re.sub(r"[^0-9+]", "", phone)
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
    if cleaned.startswith("0"):
        cleaned = "+33" + cleaned[1:]
    if cleaned.startswith("33") and not cleaned.startswith("+"):
        cleaned = "+" + cleaned
    # Garde seulement +33xxxxxxxxx
    if cleaned.startswith("+33") and len(cleaned) == 12:
        return cleaned
    return None  # Format invalide


# ─── ADB ───────────────────────────────────────────────────────────
def check_adb_device() -> bool:
    """Vérifie qu'un device Android est connecté en ADB"""
    r = subprocess.run(["adb", "devices"], capture_output=True, text=True, timeout=5)
    for line in r.stdout.splitlines():
        parts = line.strip().split()
        if len(parts) == 2 and parts[1] == "device":
            return True
    return False

def send_sms_adb(phone: str, message: str) -> tuple[bool, str]:
    """Envoie un SMS via ADB service call isms 7"""
    msg_trunc = message[:MAX_SMS_LENGTH]
    
    cmd = [
        "adb", "shell", "service", "call", "isms", "7",
        "i32", "0",
        "s16", "com.android.mms.service",
        "s16", phone,
        "s16", "null",
        "s16", msg_trunc,
        "s16", "null",
        "s16", "null"
    ]
    
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        output = r.stdout.strip()
        
        # Parcel(00000000 '....') = succès
        if "00000000" in output:
            return True, "OK"
        elif "Parcel" in output:
            return True, f"Parcel: {output[:50]}"
        else:
            return False, f"Unexpected: {output[:100]}"
    except subprocess.TimeoutExpired:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)


# ─── Supabase ──────────────────────────────────────────────────────
def get_leads(limit: int = 50) -> list:
    """Récupère les leads stage=new avec téléphone"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/contacts",
        params={
            "select": "id,first_name,last_name,phone",
            "stage": "eq.new",
            "phone": "not.is.null",
            "order": "created_at.desc",
            "limit": limit,
        },
        headers=headers,
        timeout=10,
    )
    if r.status_code == 200:
        return r.json()
    log(f"⚠️ Erreur Supabase: {r.status_code} — {r.text[:200]}")
    return []

def mark_contacted(lead_id: str) -> bool:
    """Passe le lead en stage=contacted + sms_sent"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/contacts?id=eq.{lead_id}",
        json={
            "stage": "contacted",
            "sms_sent": True,
            "sms_sent_at": datetime.now().isoformat(),
        },
        headers=headers,
        timeout=10,
    )
    return r.status_code in (200, 201, 204)


# ─── Rapports ──────────────────────────────────────────────────────
def save_report(sent: int, failed: int, errors: list):
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    
    report = f"""# SMS S10 Outreach — {today}

**Campaign:** Amens prospection via Samsung S10 ADB
**Template:** {TEMPLATE_VERSION}
**Daily limit:** {DAILY_LIMIT}

## Résultats

| Métrique | Valeur |
|----------|--------|
| Envoyés | {sent} |
| Échoués | {failed} |
| Taux succès | {round(sent/(sent+failed)*100) if (sent+failed) > 0 else 0}% |
| Date | {today} |

## Erreurs
"""
    for e in errors:
        report += f"- {e}\n"
    
    report += "\n## Prochaine étape\nJ+3 follow-up pour les non-réponses.\n"
    
    path = REPORT_DIR / f"sms-s10-{today}.md"
    path.write_text(report)
    log(f"📄 Rapport sauvegardé: {path}")


# ─── Main ──────────────────────────────────────────────────────────
def main():
    dry_run = "--dry-run" in sys.argv
    skip_cap = "--all" in sys.argv

    print("=" * 56)
    print("  📱 AMENS — SMS OUTREACH via SAMSUNG S10 ADB")
    print("=" * 56)
    log(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    if dry_run:
        log("🧪 MODE DRY-RUN — Aucun SMS envoyé")
    if skip_cap:
        log("⚠️  Daily cap ignoré (--all)")
    print()

    # 1. Vérifier ADB
    log("🔍 Vérification du Samsung S10...")
    if not check_adb_device():
        log("❌ Samsung S10 non détecté !")
        log("   Vérifie: adb devices")
        sys.exit(1)
    log("✅ Samsung S10 connecté")

    # 2. Récupérer les leads
    log("📥 Récupération des leads AgentCRM...")
    leads = get_leads(limit=DAILY_LIMIT + 5)
    log(f"📊 Leads trouvés: {len(leads)}")

    if not leads:
        log("✅ Plus de prospects à contacter !")
        return

    # 3. Filtrer les numéros valides
    valid = []
    for lead in leads:
        phone_formatted = clean_phone(lead.get("phone", ""))
        name = f"{lead.get('first_name', 'Pro')} {lead.get('last_name', '')}".strip()
        if phone_formatted:
            valid.append((lead["id"], name, lead.get("phone", ""), phone_formatted))
        else:
            log(f"⚠️  {name}: numéro invalide → {lead.get('phone')}")

    # 4. Appliquer le daily cap
    if not skip_cap:
        valid = valid[:DAILY_LIMIT]
    
    log(f"📬 SMS à envoyer: {len(valid)}")
    if not valid:
        log("✅ Rien à envoyer")
        return

    if dry_run:
        print("\n" + "-" * 56)
        log("📋 DRY-RUN — Liste des SMS qui seraient envoyés :")
        for i, (lid, name, raw_phone, phone_fmt) in enumerate(valid, 1):
            print(f"   {i:2d}. {name:20s} → {phone_fmt}")
            print(f"       \"{SMS_TEMPLATE.format(name=name.split()[0])}\"")
        print("-" * 56)
        log("🧪 Dry-run terminé. Aucun SMS envoyé.")
        return

    # 5. Envoyer les SMS
    print()
    log("📤 Envoi des SMS...")
    print()

    sent = 0
    failed = 0
    errors = []

    for i, (lead_id, name, raw_phone, phone_fmt) in enumerate(valid, 1):
        first = name.split()[0]
        message = SMS_TEMPLATE.format(name=first)

        print(f"   [{i}/{len(valid)}] {name} → {phone_fmt}")
        print(f"         \"{message}\"")

        success, err = send_sms_adb(phone_fmt, message)

        if success:
            print(f"   ✅ Envoyé")
            # Mettre à jour le lead dans AgentCRM
            mark_contacted(lead_id)
            sent += 1
        else:
            print(f"   ❌ Échec: {err}")
            errors.append(f"{name} ({phone_fmt}): {err}")
            failed += 1

        # Pause entre les SMS (sauf dernier)
        if i < len(valid):
            print(f"   ⏳ Pause {DELAY_BETWEEN_SMS}s...\n")
            time.sleep(DELAY_BETWEEN_SMS)
        else:
            print()

    # 6. Résumé
    print("=" * 56)
    log("📊 RÉSUMÉ")
    print(f"   Envoyés:    {sent}")
    print(f"   Échoués:    {failed}")
    total = sent + failed
    rate = round(sent / total * 100) if total else 0
    print(f"   Succès:     {rate}%")
    print("=" * 56)

    # 7. Rapport
    save_report(sent, failed, errors)


if __name__ == "__main__":
    main()
