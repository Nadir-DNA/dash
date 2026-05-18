#!/bin/bash
# ═══════════════════════════════════════════════════════════
# dash-agent.sh — CLI pour agents Dash
# Permet à n'importe quel agent de lire/modifier le planning
# et le statut CRM sans toucher les fichiers directement.
#
# Usage: ./dash-agent.sh <commande> [options]
# ═══════════════════════════════════════════════════════════

BASE="http://localhost:3000"
TB="http://localhost:4000"

cmd="${1:-help}"

case "$cmd" in

# ──────────────────────────────────────────────
# PLANNING / PUBLICATIONS
# ──────────────────────────────────────────────

  pubs:today)
    # Publications planifiées aujourd'hui
    today=$(date +%Y-%m-%d)
    curl -s "${BASE}/api/publications?date=${today}&status=scheduled" | python3 -m json.tool
    ;;

  pubs:list)
    # Publications du mois ou avec filtres
    # Options: --project=amens --network=tiktok --status=scheduled --date=2026-05
    project=""; network=""; status=""; date=""
    for arg in "${@:2}"; do
      case "$arg" in
        --project=*) project="${arg#*=}" ;;
        --network=*) network="${arg#*=}" ;;
        --status=*)  status="${arg#*=}" ;;
        --date=*)    date="${arg#*=}" ;;
      esac
    done
    url="${BASE}/api/publications?"
    [ -n "$project" ] && url+="project=${project}&"
    [ -n "$network" ] && url+="network=${network}&"
    [ -n "$status"  ] && url+="status=${status}&"
    [ -n "$date"    ] && url+="date=${date}&"
    curl -s "${url%&}" | python3 -m json.tool
    ;;

  pubs:add)
    # Ajouter une publication au planning
    # Usage: pubs:add --date=2026-05-20 --title="Mon titre" --project=amens --network=tiktok [--status=scheduled]
    date=""; title=""; project="amens"; network="tiktok"; status="scheduled"; desc=""
    for arg in "${@:2}"; do
      case "$arg" in
        --date=*)    date="${arg#*=}" ;;
        --title=*)   title="${arg#*=}" ;;
        --project=*) project="${arg#*=}" ;;
        --network=*) network="${arg#*=}" ;;
        --status=*)  status="${arg#*=}" ;;
        --desc=*)    desc="${arg#*=}" ;;
      esac
    done
    if [ -z "$date" ] || [ -z "$title" ]; then
      echo "❌ --date et --title sont requis"
      exit 1
    fi
    curl -s -X POST "${BASE}/api/publications" \
      -H "Content-Type: application/json" \
      -d "{\"date\":\"${date}\",\"title\":\"${title}\",\"description\":\"${desc}\",\"project\":\"${project}\",\"network\":\"${network}\",\"status\":\"${status}\"}" \
      | python3 -m json.tool
    ;;

  pubs:update)
    # Mettre à jour une publication (statut, titre, date...)
    # Usage: pubs:update --id=abc123 --status=published
    # Usage: pubs:update --id=abc123 --status=scheduled --date=2026-05-25
    id=""
    declare -A fields
    for arg in "${@:2}"; do
      case "$arg" in
        --id=*)      id="${arg#*=}" ;;
        --status=*)  fields[status]="${arg#*=}" ;;
        --title=*)   fields[title]="${arg#*=}" ;;
        --date=*)    fields[date]="${arg#*=}" ;;
        --network=*) fields[network]="${arg#*=}" ;;
        --desc=*)    fields[description]="${arg#*=}" ;;
      esac
    done
    if [ -z "$id" ]; then
      echo "❌ --id est requis"
      exit 1
    fi
    # Construire le JSON avec les champs fournis
    body="{\"id\":\"${id}\""
    for key in "${!fields[@]}"; do
      body+=",\"${key}\":\"${fields[$key]}\""
    done
    body+="}"
    curl -s -X PATCH "${BASE}/api/publications" \
      -H "Content-Type: application/json" \
      -d "$body" | python3 -m json.tool
    ;;

  pubs:publish)
    # Marquer une publication comme publiée
    # Usage: pubs:publish --id=abc123
    id=""
    for arg in "${@:2}"; do
      [[ "$arg" == --id=* ]] && id="${arg#*=}"
    done
    if [ -z "$id" ]; then echo "❌ --id est requis"; exit 1; fi
    curl -s -X PATCH "${BASE}/api/publications" \
      -H "Content-Type: application/json" \
      -d "{\"id\":\"${id}\",\"status\":\"published\"}" | python3 -m json.tool
    ;;

  pubs:delete)
    # Supprimer une publication
    # Usage: pubs:delete --id=abc123
    id=""
    for arg in "${@:2}"; do
      [[ "$arg" == --id=* ]] && id="${arg#*=}"
    done
    if [ -z "$id" ]; then echo "❌ --id est requis"; exit 1; fi
    curl -s -X DELETE "${BASE}/api/publications?id=${id}" | python3 -m json.tool
    ;;

# ──────────────────────────────────────────────
# CRM — CONTACTS
# ──────────────────────────────────────────────

  crm:contacts)
    # Lister les contacts (optionnel: filtrer par stage)
    # Usage: crm:contacts [--stage=new|contacted|qualified|proposal|won|lost] [--limit=50]
    stage=""; limit="50"
    for arg in "${@:2}"; do
      case "$arg" in
        --stage=*) stage="${arg#*=}" ;;
        --limit=*) limit="${arg#*=}" ;;
      esac
    done
    url="${BASE}/api/contacts?limit=${limit}"
    [ -n "$stage" ] && url+="&stage=${stage}"
    curl -s "$url" | python3 -m json.tool
    ;;

  crm:update)
    # Mettre à jour le statut/stage d'un contact
    # Usage: crm:update --id=<record_id> --stage=won
    # Usage: crm:update --id=<record_id> --stage=qualified --notes="RDV prévu"
    id=""
    declare -A fields
    for arg in "${@:2}"; do
      case "$arg" in
        --id=*)    id="${arg#*=}" ;;
        --stage=*) fields[stage]="${arg#*=}" ;;
        --notes=*) fields[notes]="${arg#*=}" ;;
        --value=*) fields[value]="${arg#*=}" ;;
        --email=*) fields[email]="${arg#*=}" ;;
        --phone=*) fields[phone]="${arg#*=}" ;;
      esac
    done
    if [ -z "$id" ]; then echo "❌ --id est requis"; exit 1; fi
    body="{\"id\":\"${id}\""
    for key in "${!fields[@]}"; do
      body+=",\"${key}\":\"${fields[$key]}\""
    done
    body+="}"
    curl -s -X PATCH "${BASE}/api/contacts" \
      -H "Content-Type: application/json" \
      -d "$body" | python3 -m json.tool
    ;;

# ──────────────────────────────────────────────
# SITEVITRINE — LEADS
# ──────────────────────────────────────────────

  sv:leads)
    # Lister les leads SiteVitrine
    # Usage: sv:leads [--status=deployed|pending] [--stage=new|contacted] [--limit=50]
    status=""; stage=""; limit="50"
    for arg in "${@:2}"; do
      case "$arg" in
        --status=*) status="${arg#*=}" ;;
        --stage=*)  stage="${arg#*=}" ;;
        --limit=*)  limit="${arg#*=}" ;;
      esac
    done
    url="${BASE}/api/sitevitrine?limit=${limit}"
    [ -n "$status" ] && url+="&status=${status}"
    [ -n "$stage"  ] && url+="&stage=${stage}"
    curl -s "$url" | python3 -m json.tool
    ;;

  sv:update)
    # Mettre à jour un lead SiteVitrine
    # Usage: sv:update --id=<record_id> --status=deployed --site_url=https://example.com
    id=""
    declare -A fields
    for arg in "${@:2}"; do
      case "$arg" in
        --id=*)       id="${arg#*=}" ;;
        --status=*)   fields[status]="${arg#*=}" ;;
        --stage=*)    fields[stage]="${arg#*=}" ;;
        --site_url=*) fields[site_url]="${arg#*=}" ;;
        --notes=*)    fields[notes]="${arg#*=}" ;;
      esac
    done
    if [ -z "$id" ]; then echo "❌ --id est requis"; exit 1; fi
    body="{\"id\":\"${id}\""
    for key in "${!fields[@]}"; do
      body+=",\"${key}\":\"${fields[$key]}\""
    done
    body+="}"
    curl -s -X PATCH "${BASE}/api/sitevitrine" \
      -H "Content-Type: application/json" \
      -d "$body" | python3 -m json.tool
    ;;

# ──────────────────────────────────────────────
# SANTÉ DU SYSTÈME
# ──────────────────────────────────────────────

  health)
    curl -s "${BASE}/api/health" | python3 -m json.tool
    ;;

  help|*)
    echo "
╔══════════════════════════════════════════════════════════╗
║  dash-agent.sh — Interface CLI pour agents Dash          ║
╚══════════════════════════════════════════════════════════╝

  PLANNING:
    pubs:today                           Publications à poster aujourd'hui
    pubs:list [--project=] [--status=]   Lister les publications
    pubs:add  --date= --title= [opts]    Ajouter au planning
    pubs:update --id= --status=          Mettre à jour
    pubs:publish --id=                   Marquer comme publié
    pubs:delete --id=                    Supprimer

  CRM — CONTACTS:
    crm:contacts [--stage=] [--limit=]   Lister les contacts
    crm:update --id= --stage= [--notes=] Mettre à jour un contact

  SITEVITRINE:
    sv:leads [--status=] [--limit=]      Lister les leads
    sv:update --id= --status= [opts]     Mettre à jour un lead

  SYSTÈME:
    health                               Vérifier que Dash tourne

Exemples:
  ./dash-agent.sh pubs:today
  ./dash-agent.sh pubs:add --date=2026-05-20 --title='Coach sportif' --network=tiktok
  ./dash-agent.sh pubs:publish --id=mp4m0woa88tgu
  ./dash-agent.sh crm:update --id=abc123 --stage=won
  ./dash-agent.sh sv:update --id=xyz --status=deployed --site_url=https://monsite.fr
"
    ;;
esac
