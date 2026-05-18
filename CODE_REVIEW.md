# Code Review - AgentCRM (niveau Lemlist)

## Contexte

AgentCRM est un CRM Next.js 15 + Supabase censé atteindre le niveau HubSpot + Lemlist. Après revue complète du code, plusieurs bugs critiques, incohérences de types, failles de sécurité et duplications de code ont été identifiés. Ce plan corrige tous les problèmes trouvés.

---

## 1. BUG CRITIQUE : Mismatch enum `enrollment_status`

**Le problème :** La DB définit l'enum `enrollment_status` comme `"active" | "completed" | "unsubscribed" | "bounced"`, mais le code UI et les server actions utilisent des valeurs qui n'existent PAS dans la DB : `enrolled`, `sent`, `opened`, `clicked`, `replied`.

- `app/actions/campaigns.ts:72` — insère `'enrolled'` qui n'est pas dans l'enum DB → **crash runtime garanti**
- `app/(crm)/campaigns/[id]/page.tsx:25-31` — les maps `ENROLLMENT_VARIANTS` et `ENROLLMENT_LABELS` utilisent des clés fantômes

**Fix :** Créer une migration Supabase pour aligner l'enum DB avec les besoins réels de l'app :
```sql
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'enrolled';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'sent';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'opened';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'clicked';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'replied';
```
Et mettre à jour `types/database.ts` pour refléter le nouvel enum.

**Fichiers :**
- `supabase/migrations/` — nouvelle migration
- `types/database.ts:369` — mettre à jour l'enum
- `types/database.ts:508` — mettre à jour les Constants

---

## 2. Faille sécurité : Injection SQL via recherche contacts

**Le problème :** `app/(crm)/contacts/page.tsx:38`
```typescript
if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
```
Le paramètre `q` vient des searchParams et est interpolé directement dans la chaîne PostgREST. Un utilisateur malveillant pourrait injecter des opérateurs PostgREST.

**Fix :** Sanitizer la valeur `q` en échappant les caractères spéciaux PostgREST (virgules, points, parenthèses).

**Fichier :** `app/(crm)/contacts/page.tsx`

---

## 3. Unsafe `isNaN(value!)` avec non-null assertion

**Le problème :** `app/actions/contacts.ts:31,56`
```typescript
value: isNaN(value!) ? null : value,
```
`value` peut être `null` (si `valueRaw` est vide). L'opérateur `!` force un non-null assertion sur une valeur potentiellement null. `isNaN(null!)` fonctionne en JS mais c'est un anti-pattern TypeScript dangereux.

**Fix :** Remplacer par `value == null || isNaN(value) ? null : value`

**Fichier :** `app/actions/contacts.ts`

---

## 4. `as unknown as` — Typage Supabase cassé (8 occurrences)

**Le problème :** Les relations Supabase retournent des objets typés, mais le code force des `as unknown as` partout car les types générés ne matchent pas les queries avec `select('*, companies:company_id(name)')`.

**Fix :** Créer un fichier `lib/supabase/types.ts` avec des types helper pour les queries avec relations, et remplacer les 8 occurrences de `as unknown as`.

**Fichiers :**
- `lib/supabase/types.ts` (nouveau)
- `app/(crm)/dashboard/page.tsx:106,281`
- `app/(crm)/contacts/[id]/page.tsx:40`
- `app/(crm)/contacts/page.tsx:111`
- `app/(crm)/campaigns/[id]/page.tsx:67,81,154`
- `app/(crm)/campaigns/page.tsx:105`

---

## 5. Duplication des constantes STAGE/STATUS (4 fichiers)

**Le problème :** `STAGE_VARIANTS`, `STAGE_LABELS`, `STATUS_VARIANTS`, `STATUS_LABELS` sont copiés-collés dans :
- `app/(crm)/dashboard/page.tsx`
- `app/(crm)/contacts/page.tsx`
- `app/(crm)/contacts/[id]/page.tsx`
- `app/(crm)/campaigns/[id]/page.tsx`
- `app/(crm)/campaigns/page.tsx`

**Fix :** Extraire dans `lib/constants.ts` et importer partout.

**Fichier :** `lib/constants.ts` (nouveau) + les 5 fichiers ci-dessus

---

## 6. Crash potentiel : accès `contact.first_name[0]` sans guard

**Le problème :** `app/(crm)/contacts/[id]/page.tsx:54`
```tsx
{contact.first_name[0]}{contact.last_name[0]}
```
Si `first_name` ou `last_name` est une chaîne vide (`""`), `[0]` retourne `undefined` — pas de crash, mais affichage cassé. Le champ est `NOT NULL` en DB mais pourrait être `""`.

**Fix :** Ajouter un fallback : `(contact.first_name?.[0] ?? '?')`

**Fichier :** `app/(crm)/contacts/[id]/page.tsx`

---

## 7. Pas de gestion d'erreur sur les Promise.all

**Le problème :**
- `app/(crm)/dashboard/page.tsx:62` — 7 requêtes en parallèle, si une échoue la page crash entière
- `app/(crm)/campaigns/[id]/page.tsx:42` — 3 requêtes en parallèle
- `app/(crm)/companies/page.tsx:18` — 2 requêtes en parallèle

Supabase ne throw pas par défaut (retourne `{ data, error }`), mais si le client Supabase a un problème réseau, tout explose.

**Fix :** Ajouter des fichiers `error.tsx` pour les routes principales pour gérer les erreurs gracieusement.

**Fichiers :**
- `app/(crm)/error.tsx` (nouveau)
- `app/(crm)/dashboard/error.tsx` (nouveau)

---

## 8. Server actions sans gestion d'erreur sur delete/update

**Le problème :**
- `app/actions/contacts.ts:70,78` — `updateContactStage` et `deleteContact` font `await supabase...` sans vérifier `error`
- `app/actions/campaigns.ts:54,61` — `updateCampaignStatus` et `deleteCampaign` idem
- `app/actions/companies.ts:52` — `deleteCompany` idem

Si la DB retourne une erreur (ex: FK constraint), elle est silencieusement ignorée.

**Fix :** Vérifier `error` et retourner/throw si nécessaire.

**Fichiers :**
- `app/actions/contacts.ts`
- `app/actions/campaigns.ts`
- `app/actions/companies.ts`

---

## 9. Import `Separator` non utilisé

**Le problème :** `app/(crm)/contacts/[id]/page.tsx:7` importe `Separator` mais ne l'utilise jamais.

**Fix :** Supprimer l'import.

**Fichier :** `app/(crm)/contacts/[id]/page.tsx`

---

## Ordre d'exécution

1. Créer `lib/constants.ts` (constantes partagées)
2. Créer `lib/supabase/types.ts` (types helper pour relations)
3. Créer la migration Supabase pour l'enum `enrollment_status`
4. Mettre à jour `types/database.ts`
5. Fixer les server actions (error handling + isNaN)
6. Fixer l'injection PostgREST dans contacts/page.tsx
7. Refactorer les pages pour utiliser les constantes/types partagés
8. Ajouter les error boundaries
9. Nettoyer les imports inutilisés
10. Build pour vérifier que tout compile

## Vérification

```bash
npm run build
npm run lint
```
Le build Next.js vérifiera les types TypeScript et les imports. Le lint vérifiera le style.
