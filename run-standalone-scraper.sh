#!/bin/bash
# Amens - Setup & Run Standalone Scraper
# This runs OUTSIDE Hermes - direct Python execution

echo "============================================================"
echo "🗺️  AMENS - STANDALONE SCRAPER SETUP"
echo "============================================================"

# Install Playwright
echo ""
echo "📦 Installing Playwright..."
pip3 install playwright
playwright install chromium

echo ""
echo "============================================================"
echo "✅ SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "🚀 Running scraper..."
echo ""

# Run scraper
cd ~/projects/agentcrm
python3 scripts/scrape-maps-standalone.py

echo ""
echo "============================================================"
echo "📊 NEXT STEPS"
echo "============================================================"
echo ""
echo "1. Check scraped leads:"
echo "   ls -lh ~/projects/agentcrm/scraped-leads/"
echo ""
echo "2. Import to AgentCRM:"
echo "   python3 scripts/import-csv-to-agentcrm.py scraped-leads/*.csv"
echo ""
echo "3. Send SMS:"
echo "   python3 scripts/sms-outreach.py"
echo ""
echo "============================================================"
