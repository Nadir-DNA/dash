#!/bin/bash
# Amens Auto-Scraper - Installation & Test Script
# Run this to install dependencies and test the scraper

echo "============================================================"
echo "🚀 AMENS AUTO-SCRAPER - INSTALLATION"
echo "============================================================"

# Install Playwright
echo ""
echo "📦 Installing Playwright..."
pip install --break-system-packages playwright python-dotenv requests

echo ""
echo "🌐 Installing Chromium browser..."
playwright install chromium

echo ""
echo "============================================================"
echo "✅ INSTALLATION COMPLETE!"
echo "============================================================"
echo ""
echo "🚀 Running scraper test (1 city, 1 query)..."
echo ""

# Run scraper with correct Python
cd ~/projects/agentcrm
/usr/bin/python3.12 -m playwright install chromium
/usr/bin/python3.12 scripts/auto-scraper.py

echo ""
echo "============================================================"
echo "📊 TEST COMPLETE!"
echo "============================================================"
echo ""
echo "Check results:"
echo "  - CSV files: ~/projects/agentcrm/scraped-leads/"
echo "  - AgentCRM: Open dashboard to see imported leads"
echo ""
