#!/usr/bin/env python3
"""
Amens TikTok Carousel Poster — via Samsung S10 + TikTok Studio
================================================================
Poste les carrousels Amens sur TikTok via TikTok Studio automatisé par ADB.

Flux: Studio → +Importer → galerie → sélection 5 images → caption → Publier

Usage:
    python3 scripts/tiktok-s10-poster.py               # Aujourd'hui
    python3 scripts/tiktok-s10-poster.py --cat nutrition  # Forcer
    python3 scripts/tiktok-s10-poster.py --dry-run       # Simulation
"""

import sys, os, subprocess, time
from pathlib import Path
from datetime import datetime

# ─── Config ────────────────────────────────────────────────────────
SCHEDULE = {0: "psychologie", 1: "kine_osteo", 2: "nutrition",
            3: "medecine_douce", 4: "psychologie"}
CATEGORIES = ["psychologie", "kine_osteo", "nutrition", "medecine_douce"]
CAROUSEL_DIR = os.path.expanduser("~/projects/amens-carousels-tiktok")
PHONE_DIR = "/sdcard/DCIM/Amens"

CAPTIONS = {
    "psychologie": "5 raisons de voir un psychologue 🧠\n\nCe n'est pas un signe de faiblesse. C'est un acte de courage.\n\nTrouvez votre psy sur Amens.fr\n\n#psychologie #santementale #therapie #bienetre #amens",
    "kine_osteo": "5 raisons de voir un kiné / ostéo 🦴\n\nVotre corps envoie des signaux. Vous les ignorez ?\n\nTrouvez votre pro sur Amens.fr\n\n#kinesitherapie #osteopathie #bienetre #sante #amens",
    "nutrition": "5 raisons de voir un nutritionniste 🥗\n\nVous ne manquez pas de volonté. Vous manquez de plan.\n\nTrouvez votre nutritionniste sur Amens.fr\n\n#nutrition #sante #alimentation #bienetre #amens",
    "medecine_douce": "5 raisons d'essayer les médecines douces 🌿\n\nVotre corps sait guérir. Il faut réapprendre à l'écouter.\n\nTrouvez votre thérapeute sur Amens.fr\n\n#medecinedouce #naturopathie #bienetre #sante #amens",
}

def log(msg): print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def get_category() -> str:
    if "--cat" in sys.argv:
        idx = sys.argv.index("--cat") + 1
        if idx < len(sys.argv) and sys.argv[idx] in CATEGORIES: return sys.argv[idx]
    return SCHEDULE.get(datetime.now().weekday(), "psychologie")


# ─── ADB helpers ───────────────────────────────────────────────────
def check_device() -> bool:
    r = subprocess.run(["adb", "devices"], capture_output=True, text=True, timeout=5)
    for line in r.stdout.splitlines():
        if len(line.strip().split()) == 2 and line.strip().split()[1] == "device":
            return True
    return False

def tap(x, y, label=""):
    subprocess.run(["adb", "shell", "input", "tap", str(x), str(y)], capture_output=True, timeout=5)
    if label: log(f"👆 {label}")

def push_images(category: str) -> bool:
    cat_dir = os.path.join(CAROUSEL_DIR, category)
    subprocess.run(["adb", "shell", "mkdir", "-p", PHONE_DIR], capture_output=True)
    subprocess.run(["adb", "shell", "rm", "-f", f"{PHONE_DIR}/*.png"], capture_output=True)
    for i in range(1, 6):
        local = os.path.join(cat_dir, f"slide_{i}.png")
        if not os.path.exists(local): return False
        subprocess.run(["adb", "push", local, f"{PHONE_DIR}/slide_{i}.png"], capture_output=True, timeout=10)
    # Force media scan
    subprocess.run(["adb", "shell", "am", "broadcast", "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
                    "-d", f"file://{PHONE_DIR}/slide_1.png"], capture_output=True, timeout=5)
    return True

def type_text(text: str):
    """Type text via ADB input in chunks"""
    safe = text[:200].replace("'", "\\'").replace('"', '\\"')
    for i in range(0, len(safe), 50):
        subprocess.run(["adb", "shell", "input", "text", safe[i:i+50]], capture_output=True, timeout=5)
        time.sleep(0.2)


# ─── Main post flow ───────────────────────────────────────────────
def post():
    dry_run = "--dry-run" in sys.argv
    import uiautomator2 as u2

    log("📱 Connexion S10...")
    d = u2.connect()

    cat = get_category()
    caption = CAPTIONS.get(cat, "")

    log(f"📋 Catégorie: {cat}")
    
    # Push images
    if not push_images(cat):
        log("❌ Push images échoué")
        return False
    log("✅ 5 slides pushées")
    
    if dry_run:
        log("🧪 DRY-RUN — arrêt")
        return True

    # Open TikTok Studio
    log("📱 Ouverture TikTok Studio...")
    d.app_stop("com.ss.android.tt.creator")
    time.sleep(1)
    d.app_start("com.ss.android.tt.creator")
    time.sleep(8)  # wait for full load

    # Tap "Créer" in bottom nav (element [10] bounds: 432,2025-648,2154)
    log("📱 Onglet Créer...")
    tap(540, 2090, "Onglet Créer")
    time.sleep(3)

    # Find and click "+ Téléverser" (or "+ Importer")
    # Button position from screenshot analysis: (540, 644)
    log("📥 Clic + Téléverser...")
    found = False
    try:
        for txt in ["+ Téléverser", "Téléverser", "+ Importer", "Importer"]:
            btn = d(text=txt)
            if btn.exists:
                btn.click()
                found = True
                log(f"✅ '{txt}' cliqué")
                break
    except:
        pass
    
    if not found:
        tap(540, 644, "+ Téléverser (coords)")
        found = True
    
    time.sleep(3)

    # Handle permission dialog (Android media access)
    try:
        for txt in ["Autoriser", "Uniquement cette fois-ci", "Lorsque vous utilisez"]:
            btn = d(text=txt)
            if btn.exists:
                btn.click()
                log(f"✅ Permission: {txt}")
                time.sleep(2)
                break
    except:
        pass

    time.sleep(2)

    # Gallery open - select 5 images
    # Gallery grid on Samsung: 3 columns
    log("🖼️ Sélection 5 images...")
    time.sleep(2)
    
    # Grid positions (adjusted for gallery picker overlay)
    # Row 1: 3 images, Row 2: 2 images
    for i, (x, y) in enumerate([
        (180, 950), (540, 950), (900, 950),
        (180, 1350), (540, 1350)
    ], 1):
        tap(x, y, f"Image {i}/5")
        time.sleep(0.8)

    log("✅ 5 images sélectionnées")

    # Find and tap "Next" / "Suivant"
    time.sleep(2)
    try:
        for txt in ["Suivant", "Next", "Continuer"]:
            btn = d(text=txt)
            if btn.exists:
                btn.click()
                log(f"✅ '{txt}' cliqué")
                break
        else:
            tap(1000, 160, "Suivant (top-right)")
    except:
        tap(1000, 160, "Suivant (top-right)")

    time.sleep(4)

    # Add caption
    log("📝 Légende...")
    try:
        field = d(className="android.widget.EditText")
        if field:
            field.click()
            time.sleep(1)
            type_text(caption)
            log("✅ Légende tapée")
    except:
        log("⚠️ Légende skip")

    time.sleep(1)
    
    # ESC to dismiss autocomplete
    subprocess.run(["adb", "shell", "input", "keyevent", "111"], capture_output=True, timeout=3)
    time.sleep(0.5)

    # Tap "Publier"
    log("🚀 Publication...")
    time.sleep(1)
    try:
        btn = d(text="Publier")
        if btn.exists:
            btn.click()
            log("✅ Publier cliqué")
            time.sleep(5)
            return True
    except:
        pass
    
    # Fallback
    tap(540, 2100, "Publier (fallback)")
    time.sleep(5)
    
    log("✅ Posté (présumé)")
    return True


# ─── Main ──────────────────────────────────────────────────────────
def main():
    dry_run = "--dry-run" in sys.argv
    print("=" * 56)
    print("  📱 AMENS — TIKTOK CAROUSEL via STUDIO S10")
    print("=" * 56)
    log(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    if dry_run: log("🧪 DRY-RUN")

    cat = get_category()
    log(f"📋 Catégorie: {cat}")
    log(f"📝 Caption: {CAPTIONS.get(cat,'')[:60]}...")

    if not check_device():
        log("❌ S10 non connecté")
        sys.exit(1)
    log("✅ S10 OK")

    for i in range(1, 6):
        if not os.path.exists(os.path.join(CAROUSEL_DIR, cat, f"slide_{i}.png")):
            log(f"❌ Slide {i} manquante")
            sys.exit(1)
    log("✅ 5 slides OK")

    ok = post()
    print("\n" + "=" * 56)
    log("✅ POSTÉ!" if ok else "❌ ÉCHEC")
    print("=" * 56)
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
