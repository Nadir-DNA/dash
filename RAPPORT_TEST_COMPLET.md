# 🔍 Rapport de Test Fonctionnel - AgentCRM

**Date:** 18 mars 2026  
**Projet:** https://github.com/Nadir-DNA/agentcrm  
**Version:** 1.0.0  
**Testeur:** Qwen Code (via Claude Skills)

---

## 📊 Résumé Exécutif

| Catégorie | Score | Statut |
|-----------|-------|--------|
| Architecture | 7/10 | ✅ Bon |
| Sécurité | 3/10 | 🔴 Critique |
| Scalabilité | 5/10 | 🟡 À améliorer |
| Qualité Code | 6/10 | 🟡 Acceptable |
| Couverture Tests | 5/10 | 🟡 Basique |
| Build Frontend | 9/10 | ✅ Fonctionnel |

---

## 🏗️ Structure du Projet

```
agentcrm/
├── app/                    # Next.js App Router (nouvelle version)
│   ├── (dashboard)/        # Pages dashboard
│   ├── api/               # API routes Next.js
│   └── lib/               # Utilitaires
├── dashboard/             # Next.js Dashboard (version actuelle)
│   ├── app/               # Pages
│   ├── components/        # Composants React
│   └── lib/               # API client, types
├── src/                   # Backend Node.js/Express
│   ├── agents/            # AI Agents (Hunter, Seller, Madmen, Neo)
│   ├── api/               # Routes REST
│   ├── models/            # Modèles de données
│   ├── core/              # NdjsonStore, Logger, EventBus
│   └── cli/               # Commandes CLI
├── companies/             # Données CRM par entreprise
├── supabase/              # Schéma DB & migrations
├── tests/                 # Tests unitaires & intégration
└── docs/                  # Documentation
```

---

## ✅ Ce Qui Fonctionne

### Frontend (Dashboard Next.js)
- ✅ Build réussi sans erreurs
- ✅ 10 pages générées (statiques + dynamiques)
- ✅ TypeScript correctement configuré
- ✅ Composants React fonctionnels
- ✅ API client bien implémenté
- ✅ Types bien définis

### Backend (Express)
- ✅ Serveur API fonctionnel
- ✅ Authentification par API key
- ✅ Gestion multi-entreprises
- ✅ Stockage NDJSON opérationnel
- ✅ Routes REST complètes

### Base de Données
- ✅ Schéma Supabase bien conçu
- ✅ Indexes pour la performance
- ✅ Tables bien structurées

---

## 🔴 Problèmes Critiques (P0)

### 1. API Keys Exposées dans le Code Source
**Fichier:** `.env`  
**Gravité:** CRITIQUE

```bash
# .env contient des clés API sensibles
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Impact:** Accès complet à la base de données Supabase  
**Action:** 
- ✅ `.env` est dans `.gitignore` (protégé)
- ⚠️ Vérifier que les clés ont été rotées
- ⚠️ Utiliser des variables d'environnement Vercel en production

---

### 2. Build Échoue - App Router Next.js
**Fichier:** `app/api/campaigns/schedule/route.ts`  
**Gravité:** CRITIQUE

```
Error: Module not found: Can't resolve '../supabase/client'
Error: Module not found: Can't resolve '@/lib/secure-logging'
```

**Cause:** Import de modules inexistants dans la nouvelle structure `app/`

**Impact:** L'application principale (`/app`) ne peut pas être buildée

**Action:** 
1. Créer `app/api/supabase/client.ts`
2. Créer `app/lib/secure-logging.ts`
3. Ou supprimer ces fichiers si non utilisés

---

### 3. Pas de Script de Test Configuré
**Fichier:** `package.json`  
**Gravité:** HAUT

```json
// Pas de script "test" défini
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
  // ❌ "test" manquant
}
```

**Impact:** Les tests ne peuvent pas être exécutés facilement

**Action:** Ajouter `"test": "jest"` au package.json

---

### 4. Tests Jest Non Configurés
**Fichiers:** `tests/*.test.js`  
**Gravité:** HAUT

```
SyntaxError: Unexpected token 'export'
  - uuid module uses ESM
  - Jest not configured for ESM
```

**Impact:** Les tests existants ne peuvent pas s'exécuter

**Action:** 
1. Créer `jest.config.js` avec transformIgnorePatterns
2. Ou migrer vers Vitest (plus moderne)
3. Configurer pour ESM

---

### 5. ESLint Non Configuré (v9)
**Fichier:** projet racine  
**Gravité:** MOYEN

```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

**Impact:** Pas de linting automatique

**Action:** Créer `eslint.config.js` pour ESLint 9

---

## 🟠 Problèmes Importants (P1)

### 6. Double Implémentation NdjsonStore
**Fichiers:** 
- `src/core/ndjson-store.js` (JavaScript)
- `dashboard/lib/db.ts` (TypeScript)

**Problème:** Duplication de code entre backend et frontend

**Impact:** Maintenance complexe, risque de drift

**Action:** Créer un package partagé ou choisir une seule implémentation

---

### 7. Pas de Gestion d'Erreur dans readAll()
**Fichier:** `src/core/ndjson-store.js:22`

```javascript
// Pas de try/catch - JSON corrompu crash l'app
return content.split('\n').filter(Boolean).map(line => JSON.parse(line));
```

**Impact:** Un seul fichier JSON corrompu peut bloquer toute l'application

**Action:** Ajouter try/catch autour de JSON.parse

---

### 8. Pas de Verrouillage Fichier
**Fichier:** `src/core/ndjson-store.js`

```javascript
// Écriture sans verrouillage
async append(record) {
  fs.appendFileSync(this.filePath, line);  // No lock!
}
```

**Impact:** Corruption de données avec accès concurrent

**Action:** Ajouter un mécanisme de verrouillage (ex: lockfile)

---

### 9. Race Condition dans Update
**Fichier:** `src/core/ndjson-store.js:46`

```javascript
// Lecture-modification-écriture sans atomicité
async update(id, updates) {
  const records = await this.readAll();
  // ... modify ...
  await this._writeAll(records);  // Race condition!
}
```

**Impact:** Données perdues avec accès concurrent

**Action:** Utiliser des opérations atomiques ou un mutex

---

### 10. Génération d'ID Non Sûre
**Fichier:** `src/models/contact.js`

```javascript
// ID basé sur le count, pas unique
stage_id: data.stage?.stage_id || 'new',
```

**Impact:** Duplication d'IDs en cas de concurrence

**Action:** Utiliser UUID pour les IDs

---

## 🟡 Améliorations Suggérées (P2)

### 11. Migration vers TypeScript (Backend)
**Problème:** Backend en JavaScript, pas de types

**Action:** Migrer progressivement vers TypeScript

---

### 12. Pas de Couverture de Tests
**Statut actuel:**
- ✅ `ndjson-store.test.js` - 8 tests passent
- ❌ `company.test.js` - Non exécutable (ESM)
- ❌ `api.test.js` - Non exécutable (ESM)
- ❌ `dashboard/` - Pas de tests

**Couverture estimée:** ~30%

**Action:** 
1. Configurer Jest correctement
2. Ajouter tests pour les modèles
3. Ajouter tests d'intégration
4. Ajouter tests E2E (Playwright)

---

### 13. Pas de Validation d'Entrée
**Fichier:** `src/api/routes/contacts.js`

```javascript
// Entrée utilisateur non validée
router.post('/', async (req, res) => {
  const contact = await req.company.contacts.create({
    ...req.body,  // Direct user input!
  });
});
```

**Impact:** XSS, injection, corruption de données

**Action:** Ajouter validation avec Zod ou Joi

---

### 14. Pas de Vérification Signature Webhooks
**Fichier:** `src/api/routes/webhooks.js`

```javascript
// Pas de vérification de signature
router.post('/brevo', async (req, res) => {
  const event = req.body;  // No signature verification!
});
```

**Impact:** Webhooks forgés possibles

**Action:** Implémenter vérification signature

---

### 15. Performance O(n) pour les Lectures
**Fichier:** `src/core/ndjson-store.js`

```javascript
// Lit tout le fichier pour chaque requête
async readAll() {
  const content = fs.readFileSync(this.filePath, 'utf-8').trim();
  return content.split('\n')...
}
```

**Impact:** Lent avec 1000+ contacts

**Action:** 
- Ajouter cache en mémoire
- Implémenter lecture par streaming
- Considérer SQLite pour gros volumes

---

### 16. Chemins Magiques Non Constants
**Fichier:** Plusieurs

```javascript
// 'new' est un "magic string"
stage_id: data.stage?.stage_id || 'new',
```

**Action:** Utiliser des constantes

---

## 📈 Métriques de Test

### Build
| Projet | Status | Temps |
|--------|--------|-------|
| Dashboard | ✅ Réussi | 4.7s |
| App (root) | ❌ Échoué | - |

### Tests
| Suite | Status | Tests |
|-------|--------|-------|
| ndjson-store.test.js | ✅ 8/8 | Pass |
| company.test.js | ❌ ESM Error | - |
| api.test.js | ❌ ESM Error | - |
| dashboard/ | ⚠️ Aucun test | - |

---

## 🎯 Plan d'Action Recommandé

### Immédiat (Cette Semaine)

1. **🔴 Corriger le build** - Créer les modules manquants ou supprimer les imports cassés
2. **🔴 Configurer Jest** - Créer jest.config.js avec support ESM
3. **🔴 Ajouter script test** - `"test": "jest"` dans package.json
4. **🔴 Configurer ESLint** - Créer eslint.config.js

### Court Terme (Mois 1)

1. **🟠 Ajouter validation** - Zod sur toutes les routes API
2. **🟠 Verrouillage fichier** - Ajouter lockfile pour NdjsonStore
3. **🟠 Vérification webhooks** - Implémenter signature verification
4. **🟠 Gestion d'erreurs** - try/catch dans readAll()

### Moyen Terme (Trimestre 1)

1. **🟡 Couverture tests** - Atteindre 60%+ de coverage
2. **🟡 Migration TS** - Migrer backend vers TypeScript
3. **🟡 Cache** - Implémenter cache en mémoire
4. **🟡 Logging** - Masquer données sensibles

### Long Terme (Trimestre 2+)

1. **🟢 Considérer SQLite** - Pour 1000+ contacts
2. **🟢 CI/CD** - Pipeline automatisé
3. **🟢 Documentation** - Compléter JSDoc

---

## 📝 Fichiers à Créer/Corriger

### Priorité Haute

```
1. jest.config.js                    # Config Jest
2. eslint.config.js                  # Config ESLint 9
3. app/api/supabase/client.ts        # OU supprimer app/api/campaigns/
4. app/lib/secure-logging.ts         # OU supprimer l'import
```

### Priorité Moyenne

```
5. src/core/ndjson-store.js          # Ajouter try/catch + lock
6. src/api/routes/contacts.js       # Ajouter validation Zod
7. src/api/routes/webhooks.js        # Ajouter signature verify
8. src/models/contact.js             # Utiliser UUID
```

### Priorité Basse

```
9. dashboard/lib/db.ts              # Supprimer duplication
10. src/core/ndjson-store.js         # Migrer vers TypeScript
```

---

## 🔗 Ressources

- **Repo:** https://github.com/Nadir-DNA/agentcrm
- **Dashboard:** http://localhost:3000/dashboard
- **API:** http://localhost:3000/api
- **Code Review existant:** `docs/code-review.md`

---

*Rapport généré par Qwen Code avec les skills Claude - 18 mars 2026*