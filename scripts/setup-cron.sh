#!/bin/bash
# Amens - Setup Cron Job for Auto Scraper

echo "============================================================"
echo "🤖 AMENS - CRON JOB SETUP"
echo "============================================================"

# Create log directory
mkdir -p /home/nadir/projects/agentcrm/logs

# Create config directory
mkdir -p /home/nadir/projects/agentcrm/config

# Add cron job (runs every 4 hours)
CRON_JOB="0 */4 * * * cd /home/nadir/projects/agentcrm && /usr/bin/python3 scripts/cron-auto-scraper.py >> logs/cron-scraper.log 2>&1"

# Check if already exists
if crontab -l 2>/dev/null | grep -q "cron-auto-scraper.py"; then
    echo "✅ Cron job already exists"
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron job added (runs every 4 hours)"
fi

# Show current cron jobs
echo ""
echo "📋 Current cron jobs:"
crontab -l 2>/dev/null | grep -E "(cron-auto-scraper|# Amens)" || echo "   (none)"

# Test run
echo ""
echo "🧪 Running test scrape..."
cd /home/nadir/projects/agentcrm
/usr/bin/python3 scripts/cron-auto-scraper.py

echo ""
echo "============================================================"
echo "✅ CRON SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "📊 Schedule: Every 4 hours (6 runs/day)"
echo "📍 Logs: /home/nadir/projects/agentcrm/logs/cron-scraper.log"
echo "📝 Obsidian: ~/ObsidianVault/20-Projets/Amens-Cron-Auto-Scraper-Log.md"
echo ""
echo "🎯 Coverage:"
echo "   - 8 cities × 10 professions = 80 combinations"
echo "   - 6 runs/day = Complete in ~13 days"
echo "   - ~150 leads/run = ~12 000 leads total"
echo ""
echo "🚀 To modify schedule:"
echo "   crontab -e"
echo ""
echo "🚀 To run manually:"
echo "   python3 scripts/cron-auto-scraper.py"
echo ""
echo "🚀 To check logs:"
echo "   tail -f logs/cron-scraper.log"
echo ""
echo "============================================================"
