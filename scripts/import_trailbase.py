#!/usr/bin/env python3
"""
Script d'import des données Supabase (JSON) vers Trailbase (SQLite).
Convertit les types PostgreSQL en types SQLite compatibles.

Usage:
    python3 import_trailbase.py /tmp/trailbase-test/backups /tmp/trailbase-test/data/trailbase.sqlite
"""

import json
import sqlite3
import os
import sys
from datetime import datetime


def convert_timestamptz(val):
    """Convertit un timestamp ISO 8601 en format SQLite compatible."""
    if val is None:
        return None
    try:
        # Les timestamps Supabase sont comme "2026-03-31T23:28:22.462752+00:00"
        # SQLite accepte les chaînes ISO 8601
        return val
    except:
        return val


def convert_bool(val):
    """Convertit un booléen Python en entier SQLite (0/1)."""
    if val is None:
        return None
    return 1 if val else 0


def convert_array(val):
    """Convertit une liste Python en chaîne JSON pour SQLite."""
    if val is None:
        return None
    return json.dumps(val, ensure_ascii=False)


def convert_jsonb(val):
    """Convertit un objet JSON en chaîne JSON pour SQLite."""
    if val is None:
        return None
    if isinstance(val, dict) or isinstance(val, list):
        return json.dumps(val, ensure_ascii=False)
    return val


def convert_numeric(val):
    """Convertit une valeur numérique."""
    if val is None:
        return None
    return float(val)


def prepare_row(table_name, row):
    """Prépare une ligne pour l'insertion SQLite avec conversions de type."""
    prepared = {}
    
    for key, value in row.items():
        # Colonnes avec types spéciaux (table par table)
        
        # BOOLEAN columns
        if key in ('is_recurring', 'enabled', 'a_clique'):
            prepared[key] = convert_bool(value)
        
        # TEXT[] / ARRAY columns
        elif key in ('tags', 'schedule_days'):
            prepared[key] = convert_array(value)
        
        # JSONB columns
        elif key in ('details',):
            prepared[key] = convert_jsonb(value)
        
        # NUMERIC columns
        elif key in ('value', 'conversion_rate', 'pages_per_session', 'churn_rate'):
            prepared[key] = convert_numeric(value)
        
        # TIMESTAMPTZ columns - keep as-is (already ISO 8601)
        elif key.endswith('_at') or key == 'date' or key.endswith('_date'):
            prepared[key] = convert_timestamptz(value)
        
        # DEFAULT: keep as-is (TEXT, INTEGER, REAL)
        else:
            prepared[key] = value
    
    return prepared


def build_sqlite_type(value):
    """Détermine le type SQLite pour une valeur donnée."""
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'INTEGER'
    if isinstance(value, int):
        return 'INTEGER'
    if isinstance(value, float):
        return 'REAL'
    return 'TEXT'


def main():
    if len(sys.argv) < 2:
        backup_dir = '/tmp/trailbase-test/backups'
    else:
        backup_dir = sys.argv[1]
    
    if len(sys.argv) < 3:
        db_path = '/tmp/trailbase-test/data/trailbase.sqlite'
    else:
        db_path = sys.argv[2]
    
    # Ordre d'import (respecter les clés étrangères)
    tables_order = [
        'companies',
        'contacts',
        'campaigns',
        'campaign_contacts',
        'campaign_schedules',
        'campaign_reports',
        'prospects',
        'dash_metrics',
        'sms_logs',
        'interactions',
    ]
    
    print("=== Import des données Supabase vers Trailbase ===")
    print(f"Source: {backup_dir}")
    print(f"Destination: {db_path}")
    print()
    
    # Connexion SQLite
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    total_imported = 0
    total_errors = 0
    
    for table_name in tables_order:
        json_path = os.path.join(backup_dir, f'{table_name}.json')
        
        if not os.path.exists(json_path):
            print(f"[{table_name}] Fichier JSON introuvable, ignoré")
            continue
        
        with open(json_path, 'r', encoding='utf-8') as f:
            try:
                rows = json.load(f)
            except json.JSONDecodeError as e:
                print(f"[{table_name}] Erreur de lecture JSON: {e}")
                continue
        
        if not rows:
            print(f"[{table_name}] 0 lignes (vide)")
            continue
        
        print(f"[{table_name}] {len(rows)} lignes à importer... ", end='', flush=True)
        
        imported = 0
        errors = 0
        
        for row in rows:
            try:
                prepared = prepare_row(table_name, row)
                
                columns = list(prepared.keys())
                placeholders = ','.join(['?' for _ in columns])
                col_names = ','.join(columns)
                
                values = []
                for col in columns:
                    values.append(prepared[col])
                
                sql = f"INSERT OR REPLACE INTO {table_name} ({col_names}) VALUES ({placeholders})"
                cursor.execute(sql, values)
                imported += 1
                
            except Exception as e:
                errors += 1
                if errors <= 3:
                    print(f"\n  ERREUR sur ligne {imported + errors}: {e}")
        
        conn.commit()
        print(f"{imported} importés", end='')
        if errors:
            print(f", {errors} erreurs", end='')
        print()
        
        total_imported += imported
        total_errors += errors
    
    conn.close()
    
    print()
    print("=== Résumé ===")
    print(f"Total enregistrements importés: {total_imported}")
    print(f"Total erreurs: {total_errors}")
    print(f"Base de données: {db_path}")
    
    return 0 if total_errors == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
