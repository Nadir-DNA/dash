#!/bin/bash
# Amens - Setup Chrome Profile Plugin for Hermes

echo "============================================================"
echo "🔧 AMENS - CHROME PROFILE PLUGIN SETUP"
echo "============================================================"

# Step 1: Install plugin
echo ""
echo "📦 Installing chrome-profiles plugin..."
hermes plugins install anpicasso/hermes-plugin-chrome-profiles

# Step 2: Create config
echo ""
echo "📝 Creating config..."
PLUGIN_DIR=~/.hermes/plugins/hermes-plugin-chrome-profiles
mkdir -p "$PLUGIN_DIR"

cat > "$PLUGIN_DIR/config.yaml" << 'EOF'
profiles:
  default:
    type: local
    port: 9222
    data_dir: /home/nadir/.config/google-chrome
    chrome_binary: /usr/bin/google-chrome-stable
    
  amens:
    type: local
    port: 9223
    data_dir: /home/nadir/.config/google-chrome-amens
    chrome_binary: /usr/bin/google-chrome-stable
EOF

echo "✅ Config created: $PLUGIN_DIR/config.yaml"

# Step 3: Test Chrome path
echo ""
echo "🔍 Checking Chrome installation..."
if [ -f "/usr/bin/google-chrome-stable" ]; then
    echo "   ✅ Chrome found: /usr/bin/google-chrome-stable"
    google-chrome-stable --version
elif [ -f "/usr/bin/google-chrome" ]; then
    echo "   ✅ Chrome found: /usr/bin/google-chrome"
    google-chrome --version
else
    echo "   ⚠️  Chrome not found in standard location"
    echo "   Please update config.yaml with correct Chrome path"
fi

echo ""
echo "============================================================"
echo "✅ SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Test Chrome profile in Hermes:"
echo "   hermes chat"
echo "   > browser_profile(name=\"default\")"
echo ""
echo "2. Run scraper with your Chrome profile:"
echo "   cd ~/projects/agentcrm"
echo "   python3 scripts/auto-scraper-chrome.py"
echo ""
echo "3. Your Chrome will open with ALL your extensions!"
echo "   - Instant Data Scraper will work"
echo "   - Your cookies/sessions will work"
echo "   - Google won't block you (it's YOUR browser)"
echo ""
echo "============================================================"
