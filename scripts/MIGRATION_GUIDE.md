# Guide de Migration : Supabase → Trailbase (POC)
## Projet : agentcrm

Ce document décrit la procédure de migration de la base de données **agentcrm** de Supabase (PostgreSQL) vers Trailbase (SQLite).

---

## Structure des fichiers

```
/tmp/trailbase-test/
├── backups/                          # Données exportées (format JSON)
│   ├── companies.json
│   ├── contacts.json
│   ├── campaigns.json
│   ├── campaign_contacts.json
│   ├── campaign_schedules.json
│   ├── campaign_reports.json
│   ├── prospects.json
│   ├── dash_metrics.json
│   ├── sms_logs.json
│   └── interactions.json
├── data/
│   ├── main.db                       # Base de données SQLite (migrée)
│   ├── logs.db
│   └── session.db
├── migrations/
│   └── main/
│       └── U1778328686__initial_schema.sql   # Migration SQL
├── config.textproto
├── metadata.textproto
└── secrets/
```

## Mapping des types PostgreSQL → SQLite

| PostgreSQL      | SQLite (Trailbase) | Notes                           |
|-----------------|--------------------|----------------------------------|
| UUID            | TEXT               | Valeurs UUID conservées          |
| TIMESTAMPTZ     | TEXT               | Format ISO 8601 conservé         |
| NUMERIC         | REAL               | Conversion automatique           |
| JSONB           | TEXT               | Stocké comme chaîne JSON         |
| BOOLEAN         | INTEGER (0/1)      | 0 = false, 1 = true              |
| TEXT[]          | TEXT               | Stocké comme chaîne JSON         |
| SERIAL/INTEGER  | INTEGER            | Identique                         |
| ENUM            | TEXT + CHECK       | Contrainte CHECK sur les valeurs |

## Procédure de migration

### Option 1 : Script automatisé (recommandé)

```bash
bash /home/nadir/projects/agentcrm/scripts/migrate_complete.sh
```

### Option 2 : Manuel

**1. Exporter les données Supabase**

```bash
source /home/nadir/projects/agentcrm/.env

# Exporter chaque table avec pagination
curl -X GET "${SUPABASE_URL}/rest/v1/companies?select=*" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -o /tmp/trailbase-test/backups/companies.json

# ... répéter pour chaque table
```

**2. Appliquer la migration SQL**

```bash
sqlite3 /tmp/trailbase-test/data/main.db \
  ".read /tmp/trailbase-test/migrations/main/U1778328686__initial_schema.sql"
```

**3. Importer les données**

```bash
python3 /home/nadir/projects/agentcrm/scripts/import_trailbase.py \
  /tmp/trailbase-test/backups \
  /tmp/trailbase-test/data/main.db
```

**4. Démarrer Trailbase**

```bash
trailbase run --data-dir /tmp/trailbase-test
```

## Statistiques de la migration

| Table              | Enregistrements |
|--------------------|-----------------|
| companies          | 3               |
| contacts           | 10 755          |
| campaigns          | 14              |
| campaign_contacts  | 0               |
| campaign_schedules | 2               |
| campaign_reports   | 49              |
| prospects          | 0               |
| dash_metrics       | 3               |
| sms_logs           | 100             |
| interactions       | 0               |
| **Total**          | **10 926**      |

## Vérification

```bash
# Lister les tables
sqlite3 /tmp/trailbase-test/data/main.db ".tables"

# Vérifier les comptages
sqlite3 /tmp/trailbase-test/data/main.db "
SELECT 'companies' AS tbl, COUNT(*) FROM companies
UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL SELECT 'campaigns', COUNT(*) FROM campaigns;
"

# Échantillon de données
sqlite3 /tmp/trailbase-test/data/main.db "SELECT * FROM companies;"
```

## Notes importantes

1. **UUID** : Les UUIDs sont conservés tels quels (format texte). Aucune conversion nécessaire.
2. **Index** : Les index sur les clés étrangères sont créés dans la migration.
3. **Sécurité** : Les credentials Supabase (service_role key) ne sont pas stockés dans Trailbase.
4. **Pagination** : Les tables avec >1000 lignes sont exportées par lots de 1000 via les en-têtes HTTP `Range`.
5. **Migration appliquée manuellement** : La migration SQL a été exécutée directement via sqlite3. Au prochain redémarrage de Trailbase, la migration sera ignorée car les tables existent déjà (`CREATE TABLE IF NOT EXISTS`).

## Démarrage rapide

```bash
# Démarrer Trailbase
trailbase run --data-dir /tmp/trailbase-test

# Ou en arrière-plan
trailbase run --data-dir /tmp/trailbase-test > /tmp/trailbase.log 2>&1 &
```
