# ADR: Pourquoi AgentCRM plutôt que HubSpot ou Salesforce

**Date:** 2026-03-12
**Statut:** Accepted
**Décideurs:** AgentViz (Nadir)
**Contexte:** Choix du CRM pour les projets Amens, SiteVitrine, AgentViz

---

## Contexte

AgentViz exploite plusieurs projets (Amens, SiteVitrine) avec des pipelines de prospection entièrement automatisés. Le volume attendu est de 100 à 1 000 contacts par projet, avec des campagnes SMS/email déclenchées par des AI Agents sans intervention humaine.

Il fallait choisir entre :

1. **HubSpot** (SaaS, freemium/payant)
2. **Salesforce** (SaaS, enterprise)
3. **Pipedrive** (SaaS, SMB)
4. **AgentCRM** (in-house, file-based)

---

## Décision

**Nous avons choisi de construire AgentCRM**, un CRM file-based spécifiquement conçu pour être piloté par des AI Agents.

---

## Comparaison

### HubSpot

| Critère | HubSpot | AgentCRM |
|---------|---------|----------|
| Prix | Gratuit limité, 20€+/mois pour l'automation | 0€ |
| Accès API | OAuth + tokens rotatifs, limites de taux | REST local, pas de rate limit |
| Automation | Visual builder, limité au plan payant | YAML, illimité, code-first |
| Agent-first | ❌ Conçu pour des humains qui cliquent | ✅ Conçu pour des scripts et agents |
| Données propres | SaaS lock-in | Fichiers NDJSON locaux, git-versionable |
| Multi-company | Nécessite des comptes séparés | Natif (1 dossier/company) |
| Déploiement | Cloud uniquement | Local + Vercel au choix |

**Problème principal avec HubSpot :** L'API impose 100 req/10s par token. Pour un agent qui traite 500 contacts en rafale, c'est une friction opérationnelle constante. De plus, les workflows automation sont réservés aux plans payants (Marketing Hub Starter : 20€/mois minimum).

### Salesforce

| Critère | Salesforce | AgentCRM |
|---------|------------|----------|
| Prix | 75€+/utilisateur/mois | 0€ |
| Complexité | SOQL, Apex, Flow Builder | REST basique, YAML |
| Overhead setup | 2–4 semaines | < 1 heure |
| Adapté aux micro-projets | ❌ Overkill | ✅ Léger et ciblé |
| Agent-first | ❌ Conçu pour des équipes commerciales | ✅ Pipeline entièrement automatisable |

**Problème principal avec Salesforce :** La courbe d'apprentissage et le coût sont inadaptés à un contexte de bootstrapping. Piloter Salesforce depuis un AI Agent nécessite d'apprendre SOQL, gérer des OAuth tokens d'entreprise, et naviguer une API complexe — pour des projets qui font 165 ventes/an.

### Pipedrive

| Critère | Pipedrive | AgentCRM |
|---------|-----------|----------|
| Prix | 15€+/utilisateur/mois | 0€ |
| API | Bonne, REST | REST local, 0 overhead |
| Automation | Limité au plan Advanced (33€/mois) | YAML natif |
| Agent-first | ❌ | ✅ |
| Stockage données | SaaS | Local, contrôle total |

**Problème principal avec Pipedrive :** Similaire à HubSpot. L'automation est derrière un paywall, et les webhooks entrants sont limités au plan Advanced.

---

## Pourquoi AgentCRM

### 1. Conçu pour des AI Agents, pas des humains

HubSpot, Salesforce et Pipedrive supposent un opérateur humain qui navigue une interface. AgentCRM suppose un agent autonome qui lit et écrit des fichiers, appelle une API REST locale, et enchaîne des actions sans supervision.

Concrètement :
- Pas d'interface graphique requise
- Pas d'authentification complexe (OAuth, token refresh)
- Pas de rate limiting
- Pipeline configurable en YAML lisible par un agent

### 2. Zéro coût opérationnel

Pour 3 projets (Amens, SiteVitrine, AgentViz) avec ~500 contacts chacun :

| Solution | Coût mensuel estimé |
|----------|---------------------|
| HubSpot Marketing Starter × 3 | 60€/mois |
| Pipedrive Advanced × 3 | ~100€/mois |
| Salesforce Essentials × 1 | 75€/mois |
| **AgentCRM** | **0€** |

### 3. Données locales, versionnées, portables

Les contacts sont stockés en NDJSON — un format lisible, git-versionable, importable/exportable sans dépendance externe. En cas de migration, c'est un `cp` ou un `git push`.

### 4. Multi-company natif

Un dossier par company. Pas de compte SaaS séparé, pas de workspace différent, pas de coûts multipliés. AgentViz pilote Amens et SiteVitrine depuis la même instance.

### 5. Automation sans paywall

Les workflows YAML sont exécutés localement par les agents. Il n'y a pas de "plan payant" pour débloquer l'automation. Le code est la limite, pas le pricing.

---

## Compromis acceptés

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| Pas d'interface graphique native | Moins confortable pour un humain non-technique | Dashboard Next.js prévu (AME-56) |
| Pas de reporting avancé | Pas de charts natifs | Requêtes NDJSON + export CSV |
| Pas de support / SLA externe | Maintenance interne | Code simple, bien testé |
| Sync temps réel multi-utilisateur | Non prévu | Cas d'usage mono-agent |

---

## Conclusion

AgentCRM n'est pas le meilleur CRM pour une équipe commerciale de 10 personnes avec un manager qui veut des tableaux de bord Salesforce. C'est le meilleur CRM pour un AI Agent qui traite 500 contacts sans supervision humaine, avec des campagnes SMS/email déclenchées automatiquement, sur un projet bootstrappé à coût quasi-zéro.

**C'est exactement notre use case.**

---

*Document maintenu dans `decisions/` selon la convention ADR (Architecture Decision Records).*
