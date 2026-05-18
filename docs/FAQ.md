# FAQ — AgentCRM Troubleshooting

Réponses aux questions fréquentes et solutions aux problèmes courants.

---

## Installation & Démarrage

### 1. L'API ne démarre pas — `Error: Cannot find module`

```
Error: Cannot find module 'express'
```

**Solution :** Les dépendances ne sont pas installées.

```bash
npm install
```

---

### 2. L'API démarre mais `/api/health` retourne une erreur 500

**Solution :** Vérifier que le dossier `CRM_STORAGE_PATH` existe et est accessible en écriture.

```bash
echo $CRM_STORAGE_PATH   # doit afficher ./companies ou un chemin absolu
mkdir -p ./companies
npm run dev
```

---

### 3. `npm run dev` plante avec `EADDRINUSE`

```
Error: listen EADDRINUSE :::3000
```

**Solution :** Le port 3000 est déjà utilisé. Soit arrêter l'autre processus, soit changer le port :

```bash
PORT=3001 npm run dev
```

---

### 4. Les variables d'environnement ne sont pas prises en compte

**Solution :** S'assurer que le fichier `.env` existe à la racine du projet (pas `.env.local` ou `.env.development`).

```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

---

## Companies & Contacts

### 5. `POST /api/companies` retourne `409 Conflict`

```json
{"error":"Company already exists"}
```

**Solution :** La company existe déjà. Vérifier avec :

```bash
curl http://localhost:3000/api/companies
```

Pour recréer, supprimer d'abord le dossier :

```bash
rm -rf companies/mycompany
```

⚠️ Ceci supprime tous les contacts associés.

---

### 6. `POST /api/companies/:id/contacts` retourne `400`

```json
{"error":"name or email required"}
```

**Solution :** Le body doit contenir au moins `basic.name` ou `basic.email` :

```json
{
  "basic": {
    "name": "Marie Dupont",
    "email": "marie@example.com"
  }
}
```

---

### 7. `GET /api/companies/:id/contacts` retourne une liste vide

**Solution A :** Aucun contact n'a encore été créé. Importer via CSV ou créer manuellement.

**Solution B :** Le `CRM_STORAGE_PATH` pointe vers un dossier différent de celui où les contacts ont été créés. Vérifier la valeur dans `.env`.

---

### 8. Les contacts disparaissent après un redémarrage

AgentCRM stocke les données en fichiers NDJSON sur disque — elles persistent entre les redémarrages.

**Causes possibles :**
- Le `CRM_STORAGE_PATH` pointe vers `/tmp` (effacé au redémarrage système)
- Les contacts ont été créés dans un dossier temporaire lors des tests

**Solution :** Définir un chemin permanent dans `.env` :

```env
CRM_STORAGE_PATH=/home/nadir/agentcrm/companies
```

---

### 9. La recherche `?q=` ne trouve pas un contact

La recherche filtre sur `basic.name`, `basic.email`, et `basic.company`. Si le contact n'a pas ces champs, il ne sera pas trouvé.

**Solution :** Vérifier la structure du contact :

```bash
curl http://localhost:3000/api/companies/mycompany/contacts/c0001
```

Le contact doit avoir des champs sous `basic`. Mettre à jour si nécessaire :

```bash
curl -X PUT http://localhost:3000/api/companies/mycompany/contacts/c0001 \
  -H "Content-Type: application/json" \
  -d '{"basic":{"name":"Marie Dupont","email":"marie@example.com"}}'
```

---

## Import CSV

### 10. L'import CSV importe 0 contacts

**Causes fréquentes :**
- Le fichier CSV n'a pas de header row
- Les noms de colonnes ne correspondent pas (`Name` au lieu de `name`)
- Le fichier utilise des points-virgules (`;`) au lieu de virgules (`,`) comme séparateur

**Solution :** Vérifier le header :

```bash
head -1 ./contacts.csv
# doit afficher: name,email,phone,...
```

Pour les fichiers avec point-virgule (exports Excel français) :

```bash
sed 's/;/,/g' contacts.csv > contacts-fixed.csv
npm run import:csv -- --company=mycompany --file=./contacts-fixed.csv
```

---

### 11. Les contacts importés ont des champs vides

**Solution :** L'ordre des colonnes dans le CSV doit correspondre exactement aux headers. Ouvrir le CSV dans un éditeur texte pour vérifier.

---

## SMS & Email

### 12. Les SMS ne s'envoient pas

**Vérifications :**

1. `BREVO_API_KEY` est défini dans `.env`
2. Le compte Brevo est actif et crédité
3. Le contact a un champ `basic.phone` en format E.164 (`+33612345678`)

```bash
# Test direct Brevo
curl -X POST https://api.brevo.com/v3/transactionalSMS/sms \
  -H "api-key: $BREVO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sender":"AgentViz","recipient":"+33612345678","content":"Test"}'
```

---

### 13. Les emails ne s'envoient pas

**Vérifications :**

1. `RESEND_API_KEY` est défini dans `.env`
2. Le domaine expéditeur est vérifié sur Resend
3. Le contact a un champ `basic.email` valide

```bash
# Test direct Resend
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@votredomaine.fr","to":"test@example.com","subject":"Test","text":"Test"}'
```

---

## Agents

### 14. Les agents démarrent mais ne font rien

**Causes fréquentes :**
- Pas de contacts dans le CRM
- Les fichiers de configuration YAML ne sont pas créés
- Le chemin `CRM_STORAGE_PATH` ne correspond pas

**Solution :**

```bash
# Vérifier les contacts
curl http://localhost:3000/api/companies/mycompany/contacts | python3 -c "import sys,json; d=json.load(sys.stdin); print('Contacts:', d['total'])"

# Vérifier la config
ls companies/mycompany/automations/
```

---

### 15. Un agent envoie le même SMS plusieurs fois au même contact

L'agent doit enregistrer les interactions dans `interactions.ndjson` pour éviter les doublons. Si ce fichier ne se met pas à jour, l'agent peut rejouer les mêmes actions.

**Solution :** Vérifier que `interactions.ndjson` existe et est mis à jour après chaque run :

```bash
ls -la companies/mycompany/crm/interactions.ndjson
tail -5 companies/mycompany/crm/interactions.ndjson
```

---

### 16. Comment arrêter un agent en cours d'exécution ?

```bash
# Trouver le PID
ps aux | grep "agents"

# Arrêter proprement
kill <PID>

# Ou arrêter tous les agents Node
pkill -f "node src/agents"
```

---

## Tests

### 17. `npm test` échoue avec `ENOENT`

```
ENOENT: no such file or directory, open '/tmp/agentcrm-test-xxx/...'
```

**Solution :** Les tests créent leur propre dossier temporaire. Cette erreur indique généralement un problème de permissions sur `/tmp` :

```bash
ls -la /tmp | grep agentcrm
```

Si `/tmp` n'est pas accessible en écriture, définir un chemin alternatif :

```bash
TMPDIR=/var/tmp npm test
```

---

### 18. Les tests passent en local mais échouent en CI

**Causes fréquentes :**
- Variables d'environnement manquantes en CI
- Port 3099 (port de test) déjà utilisé dans l'environnement CI

**Solution :** Les tests utilisent `process.env.PORT = '3099'`. Vérifier qu'aucun autre processus n'utilise ce port en CI.

---

## Général

### 19. Comment voir tous les contacts d'une company en JSON ?

```bash
cat companies/mycompany/crm/contacts.ndjson | python3 -c "
import sys, json
for line in sys.stdin:
    line = line.strip()
    if line:
        c = json.loads(line)
        print(c.get('id'), c.get('basic', {}).get('name'), c.get('stage', {}).get('stage_id'))
"
```

---

### 20. Comment sauvegarder les données ?

Les données sont des fichiers texte dans `companies/`. Une simple copie suffit :

```bash
# Backup
cp -r companies/ companies_backup_$(date +%Y%m%d)/

# Ou via git
git add companies/
git commit -m "backup: contacts $(date +%Y%m%d)"
```

---

### 21. Comment migrer vers un autre serveur ?

```bash
# Sur le serveur source
tar czf agentcrm-data.tar.gz companies/ .env

# Sur le serveur cible
tar xzf agentcrm-data.tar.gz
npm install
npm run dev
```

---

### 22. Comment réinitialiser complètement une company ?

```bash
# Supprimer toutes les données
rm -rf companies/mycompany

# Recréer
npm run company:create -- --name=mycompany
```

⚠️ **Irréversible.** Tous les contacts et interactions sont supprimés.

---

Pour toute question non couverte ici, ouvrir un ticket dans Paperclip ou contacter [@AgentViz](https://github.com/Nadir-DNA).
