#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Dash — Start Script
# Lance TrailBase + Next.js, ouvre le navigateur
# ═══════════════════════════════════════════════════════════

DASH_DIR="$HOME/projects/dash"
TRAILBASE="$HOME/.local/bin/trailbase"
TRAILDEPOT="$DASH_DIR/traildepot"

cd "$DASH_DIR" || { echo "❌ Dossier $DASH_DIR introuvable"; read -p "Appuie sur Entrée..."; exit 1; }

echo "╔══════════════════════════════════════════════╗"
echo "║             ⬡  Dash  ⬡                      ║"
echo "║  Nothing Glyph Dashboard                    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Nettoyage propre à la sortie (Ctrl+C) ──────────────────
cleanup() {
  echo ""
  echo "🛑 Arrêt de Dash..."
  [ -n "$NEXT_PID" ] && kill "$NEXT_PID" 2>/dev/null
  [ -n "$TRAILBASE_PID" ] && kill "$TRAILBASE_PID" 2>/dev/null
  wait "$NEXT_PID" 2>/dev/null
  wait "$TRAILBASE_PID" 2>/dev/null
  echo "✅ Arrêté proprement."
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Kill processus existants sur les ports ──────────────────
echo "🔄 Nettoyage des processus existants..."
fuser -k 3000/tcp 2>/dev/null || kill $(lsof -t -i:3000 2>/dev/null) 2>/dev/null
fuser -k 4000/tcp 2>/dev/null || kill $(lsof -t -i:4000 2>/dev/null) 2>/dev/null
sleep 1

# ── TrailBase ───────────────────────────────────────────────
echo "📦 Démarrage TrailBase..."
"$TRAILBASE" --data-dir "$TRAILDEPOT" run 2>&1 | grep -v "^$" &
TRAILBASE_PID=$!

for i in $(seq 1 20); do
  if lsof -i :4000 -iTCP -sTCP:LISTEN 2>/dev/null | grep -q LISTEN; then
    echo "   ✅ TrailBase prêt (port 4000)"
    break
  fi
  if [ $i -eq 20 ]; then
    echo "   ❌ TrailBase n'a pas démarré"
    read -p "Appuie sur Entrée pour quitter..."
    exit 1
  fi
  sleep 1
done

# ── Next.js ─────────────────────────────────────────────────
echo "⚡ Démarrage Dash (Next.js)..."
node "$DASH_DIR/node_modules/.bin/next" dev --port 3000 2>&1 &
NEXT_PID=$!

for i in $(seq 1 40); do
  if lsof -i :3000 -iTCP -sTCP:LISTEN 2>/dev/null | grep -q LISTEN; then
    echo "   ✅ Dash prêt (port 3000)"
    break
  fi
  if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "   ❌ Next.js a planté"
    read -p "Appuie sur Entrée pour quitter..."
    exit 1
  fi
  if [ $i -eq 40 ]; then
    echo "   ❌ Next.js n'a pas démarré à temps"
    read -p "Appuie sur Entrée pour quitter..."
    exit 1
  fi
  sleep 1
done

# ── Navigateur ───────────────────────────────────────────────
echo "🌐 Ouverture du navigateur..."
sleep 1
xdg-open "http://localhost:3000/dashboard" 2>/dev/null &

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Dash est prêt !                          ║"
echo "║  📍 http://localhost:3000/dashboard          ║"
echo "║  🛑 Ctrl+C pour arrêter                     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Attendre les deux processus
wait "$NEXT_PID"
