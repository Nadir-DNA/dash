#!/bin/bash
# Script complet de migration Supabase → Trailbase
# Usage: bash migrate_complete.sh
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       Migration Supabase → Trailbase (POC) - agentcrm      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

TIMESTAMP=$(date +%s)
BACKUP_DIR="/tmp/trailbase-test/backups_${TIMESTAMP}"
DATA_DIR="/tmp/trailbase-test"
MIGRATIONS_DIR="${DATA_DIR}/migrations/main"
DB_PATH="${DATA_DIR}/data/main.db"
EXPORT_SCRIPT="/tmp/export_supabase_${TIMESTAMP}.sh"
IMPORT_SCRIPT="/home/nadir/projects/agentcrm/scripts/import_trailbase.py"

# 1. Créer le dossier de backup
mkdir -p "${BACKUP_DIR}"
echo "✅ Dossier backup: ${BACKUP_DIR}"

# 2. Exporter les données Supabase
echo ""
echo "--- Étape 1: Export Supabase ---"
source /home/nadir/projects/agentcrm/.env

API_URL="${SUPABASE_URL}/rest/v1"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

TABLES=("companies" "contacts" "campaigns" "campaign_contacts" "campaign_schedules" "campaign_reports" "prospects" "dash_metrics" "sms_logs" "interactions")

for TABLE in "${TABLES[@]}"; do
    echo -n "  Export de ${TABLE}..."
    
    # Get total count
    TOTAL=$(curl -s -X GET "${API_URL}/${TABLE}?select=count" \
        -H "apikey: ${SERVICE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_KEY}" \
        -H "Accept: application/json" \
        -H "Prefer: count=exact" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['count'])" 2>/dev/null || echo "0")
    
    echo -n " ${TOTAL} enreg."
    
    if [ "$TOTAL" = "0" ]; then
        echo " []" > "${BACKUP_DIR}/${TABLE}.json"
        echo " ✓"
        continue
    fi
    
    # Fetch all data with pagination
    OFFSET=0
    BATCH_SIZE=1000
    TEMP_DIR=$(mktemp -d)
    BATCH_NUM=0
    
    while [ $OFFSET -lt $TOTAL ]; do
        END=$((OFFSET + BATCH_SIZE - 1))
        curl -s -X GET "${API_URL}/${TABLE}?select=*" \
            -H "apikey: ${SERVICE_KEY}" \
            -H "Authorization: Bearer ${SERVICE_KEY}" \
            -H "Accept: application/json" \
            -H "Content-Type: application/json" \
            -H "Range-Unit: items" \
            -H "Range: ${OFFSET}-${END}" > "${TEMP_DIR}/batch_${BATCH_NUM}.json"
        OFFSET=$((OFFSET + BATCH_SIZE))
        BATCH_NUM=$((BATCH_NUM + 1))
    done
    
    python3 -c "
import json, os, glob
batches = sorted(glob.glob('${TEMP_DIR}/batch_*.json'), key=lambda x: int(x.split('_')[-1].split('.')[0]))
all_data = []
for b in batches:
    with open(b) as f:
        data = json.load(f)
        if isinstance(data, list):
            all_data.extend(data)
    os.remove(b)
os.rmdir('${TEMP_DIR}')
with open('${BACKUP_DIR}/${TABLE}.json', 'w', encoding='utf-8') as f:
    json.dump(all_data, f, ensure_ascii=False, indent=2)
"
    echo " ✓"
done

echo ""
echo "--- Étape 2: Application de la migration SQL ---"
MIGRATION_FILE="${MIGRATIONS_DIR}/U1778328686__initial_schema.sql"

if [ -f "$MIGRATION_FILE" ]; then
    echo "  Fichier de migration trouvé: ${MIGRATION_FILE}"
    sqlite3 "${DB_PATH}" ".read ${MIGRATION_FILE}" 2>&1
    echo "  ✅ Migration appliquée avec succès"
else
    echo "  ❌ Fichier de migration introuvable: ${MIGRATION_FILE}"
    exit 1
fi

echo ""
echo "--- Étape 3: Import des données ---"
python3 "${IMPORT_SCRIPT}" "${BACKUP_DIR}" "${DB_PATH}"

echo ""
echo "--- Étape 4: Vérification finale ---"
sqlite3 "${DB_PATH}" "
SELECT 'companies' as tbl, COUNT(*) as cnt FROM companies
UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL SELECT 'campaign_contacts', COUNT(*) FROM campaign_contacts
UNION ALL SELECT 'campaign_schedules', COUNT(*) FROM campaign_schedules
UNION ALL SELECT 'campaign_reports', COUNT(*) FROM campaign_reports
UNION ALL SELECT 'prospects', COUNT(*) FROM prospects
UNION ALL SELECT 'dash_metrics', COUNT(*) FROM dash_metrics
UNION ALL SELECT 'sms_logs', COUNT(*) FROM sms_logs
UNION ALL SELECT 'interactions', COUNT(*) FROM interactions
ORDER BY tbl;
"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     Migration terminée avec succès !                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Base de données : ${DB_PATH}"
echo "Backup JSON     : ${BACKUP_DIR}/"
echo ""
echo "Pour démarrer Trailbase :"
echo "  trailbase run --data-dir ${DATA_DIR}"
