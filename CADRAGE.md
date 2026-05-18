# AgentCRM - Document de Cadrage

**Version:** 1.0  
**Date:** 2026-03-16  
**Vision:** CRM "Agent-First" pour automatisation prospection

---

## 1. 🎯 VISION ET OBJECTIF

### 1.1 Ce qu'AgentCRM N'EST PAS
- ❌ CRM classique avec UI complexe pour humains
- ❌ Système avec dashboard graphique lourd
- ❌ Outil de gestion manuelle

### 1.2 Ce qu'AgentCRM EST
- ✅ CRM simple et direct pilotable par AGENTS IA
- ✅ Interface CLI riche pour LLMs/Agents
- ✅ Système d'automatisation Cold SMS & Cold Email
- ✅ Multi-projets cloisonnés

### 1.3 Objectifs
```
1. Centraliser et enrichir listes de contacts
2. Gérer campagnes outreach (SMS/Email) de manière autonome
3. Permettre aux agents IA de piloter sans UI graphique
```

---

## 2. 🏗️ ARCHITECTURE MULTI-PROJETS

### 2.1 Principe de Cloisonnement

Chaque projet est STRICTEMENT isolé:

```
┌─────────────────────────────────────────────────────────┐
│                    AGENTCRM                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  PROJET: Amens                                  │   │
│  │  - Contacts: Uniquement prospects Amens         │   │
│  │  - Campagnes: Uniquement campagnes Amens        │   │
│  │  - Agents: Uniquement agents Amens              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  PROJET: Site Vitrine                           │   │
│  │  - Contacts: Uniquement prospects SiteVitrine   │   │
│  │  - Campagnes: Uniquement campagnes SiteVitrine  │   │
│  │  - Agents: Uniquement agents SiteVitrine        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Isolement

| Aspect | Règle |
|--------|-------|
| **Données** | Un agent Projet A ne voit PAS données Projet B |
| **Agents** | Un agent ne travaille que sur SON projet |
| **Campagnes** | Campagnes isolées par projet |
| **API Keys** | Chaque projet peut avoir ses propres clés |

---

## 3. 📁 STRUCTURE DE DONNÉES

### 3.1 Contact (Flexible)

```json
{
  "id": "c0001",
  "project_id": "amens",
  "created_at": "2026-03-16T00:00:00Z",
  
  "standard_fields": {
    "name": "Maître Fiona SILES",
    "email": "fiona@example.com",
    "phone": "0614675809"
  },
  
  "dynamic_fields": {
    "company": "Cabinet SILES",
    "sector": "Avocat",
    "address": "79 Bd de Dunkerque, Marseille",
    "website_status": "none",
    "google_maps_url": "https://...",
    "site_url": "https://...",
    "custom_preview_link": "https://..."
  },
  
  "metadata": {
    "source": "google_maps",
    "imported_at": "2026-03-11T23:26:18Z",
    "imported_by": "hunter_agent"
  },
  
  "stage": "new",
  "labels": ["hot-lead", "no-website"],
  "notes": "À contacter"
}
```

### 3.2 Campagne

```json
{
  "id": "camp001",
  "project_id": "sitevitrine",
  "name": "SMS Batch 1 - 2026-03-16",
  "type": "sms",
  "status": "completed",
  
  "config": {
    "template_id": "tpl_sms_001",
    "channel": "brevo_sms",
    "scheduled_at": "2026-03-16T10:30:00Z"
  },
  
  "targeting": {
    "contact_ids": ["c0001", "c0002", ...],
    "filters": {
      "stage": "new",
      "labels": ["hot-lead"]
    }
  },
  
  "stats": {
    "total_contacts": 20,
    "sent": 20,
    "delivered": 19,
    "failed": 1,
    "replied": 3
  },
  
  "created_at": "2026-03-16T00:00:00Z",
  "completed_at": "2026-03-16T10:35:00Z"
}
```

### 3.3 Interaction

```json
{
  "id": "int0001",
  "contact_id": "c0001",
  "campaign_id": "camp001",
  "type": "sms_sent",
  "status": "delivered",
  "content": "👋 Bonjour Maître...",
  "metadata": {
    "brevo_message_id": "12345",
    "sent_at": "2026-03-16T10:30:00Z",
    "delivered_at": "2026-03-16T10:30:05Z"
  },
  "created_at": "2026-03-16T10:30:00Z"
}
```

### 3.4 Template

```json
{
  "id": "tpl_sms_001",
  "project_id": "sitevitrine",
  "name": "SiteVitrine - Premier Contact",
  "channel": "sms",
  "content": "👋 Bonjour {{contact.name}},\n\nVotre site vitrine est prêt ! 🚀\n\n🌐 {{contact.site_url}}\n\nL'équipe SiteVitrine",
  "variables": ["contact.name", "contact.site_url"],
  "created_at": "2026-03-16T00:00:00Z"
}
```

---

## 4. 🖥️ INTERFACE CLI (AGENT-FIRST)

### 4.1 Principes

- **CLI-first:** Toutes les opérations accessibles en CLI
- **JSON output:** Sortie structurée pour LLMs
- **Verbose mode:** Logs détaillés pour debugging
- **Non-interactive:** Pas de prompts, tout en arguments

### 4.2 Commandes Principales

```bash
# Projects
agentcrm project list
agentcrm project create --name "SiteVitrine"
agentcrm project select --name "SiteVitrine"

# Contacts
agentcrm contact list --project sitevitrine --stage new
agentcrm contact import --file contacts.csv --project sitevitrine
agentcrm contact get --id c0001
agentcrm contact update --id c0001 --stage contacted
agentcrm contact delete --id c0001

# Campaigns
agentcrm campaign create --name "SMS Batch 1" --type sms --project sitevitrine
agentcrm campaign list --project sitevitrine
agentcrm campaign send --id camp001
agentcrm campaign pause --id camp001
agentcrm campaign stats --id camp001

# Templates
agentcrm template list --type sms
agentcrm template create --name "Welcome SMS" --type sms --file template.txt

# Agent Actions
agentcrm agent run --name hunter --project sitevitrine
agentcrm agent run --name seller --project sitevitrine
```

### 4.3 Exemples d'Usage par Agent

**Hunter Agent (Prospection):**
```bash
# Import nouveaux contacts
agentcrm contact import --file google_maps_scrape.csv --project sitevitrine

# Taguer comme hot lead
agentcrm contact update --id c0001 --labels "hot-lead,no-website"

# Ajouter à campagne
agentcrm campaign add-contacts --id camp001 --contacts c0001,c0002
```

**Seller Agent (Vente):**
```bash
# Lancer campagne SMS
agentcrm campaign send --id camp001

# Vérifier stats
agentcrm campaign stats --id camp001 --json

# Récupérer réponses
agentcrm campaign replies --id camp001 --json
```

---

## 5. 🔌 INTÉGRATIONS API

### 5.1 Architecture Modulaire

```
┌─────────────────────────────────────────────────────────┐
│                    AGENTCRM                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Channel Manager                                │   │
│  │  - Interface abstraite d'envoi                  │   │
│  │  - Retry logic                                  │   │
│  │  - Rate limiting                                │   │
│  └─────────────────────────────────────────────────┘   │
│           │                    │                        │
│           ▼                    ▼                        │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Brevo Plugin   │  │  Email Plugin   │              │
│  │  (SMS)          │  │  (Resend/Brevo) │              │
│  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

### 5.2 SMS (Brevo) - DÉFINI

```typescript
interface SMSProvider {
  send(phone: string, message: string): Promise<SendResult>;
  getStatus(messageId: string): Promise<StatusResult>;
}

// Implémentation Brevo
class BrevoSMS implements SMSProvider {
  async send(phone: string, message: string) {
    // API Brevo SMS
  }
}
```

**Configuration:**
```bash
agentcrm config set brevo_api_key "xkeysib-xxx"
agentcrm config set brevo_sender "SiteVitrine"
```

### 5.3 Email (À DÉFINIR)

```typescript
interface EmailProvider {
  send(to: string, subject: string, body: string): Promise<SendResult>;
  getStatus(messageId: string): Promise<StatusResult>;
}

// Providers possibles:
// - ResendEmail
// - BrevoEmail
// - SendGridEmail
```

**Architecture agnostique:**
```bash
# L'agent choisit le provider
agentcrm config set email_provider "resend"
agentcrm config set resend_api_key "re_xxx"
```

---

## 6. 📂 STRUCTURE DU PROJET

```
agentcrm/
├── cli/
│   ├── index.ts                 # Point d'entrée CLI
│   ├── commands/
│   │   ├── project.ts           # Commandes projets
│   │   ├── contact.ts           # Commandes contacts
│   │   ├── campaign.ts          # Commandes campagnes
│   │   ├── template.ts          # Commandes templates
│   │   └── agent.ts             # Commandes agents
│   └── utils/
│       ├── output.ts            # Formatage JSON output
│       └── config.ts            # Gestion config
│
├── core/
│   ├── ProjectManager.ts        # Gestion multi-projets
│   ├── ContactManager.ts        # CRUD contacts
│   ├── CampaignManager.ts       # Gestion campagnes
│   ├── TemplateManager.ts       # Gestion templates
│   └── ChannelManager.ts        # Orchestration channels
│
├── channels/
│   ├── interface.ts             # Interface abstraite
│   ├── brevo/
│   │   ├── sms.ts               # Brevo SMS
│   │   └── email.ts             # Brevo Email (futur)
│   └── resend/
│       └── email.ts             # Resend Email
│
├── agents/
│   ├── hunter/
│   │   └── index.ts             # Agent de prospection
│   └── seller/
│       └── index.ts             # Agent de vente
│
├── storage/
│   └── ndjson/
│       ├── index.ts             # NDJSON storage layer
│       └── validator.ts         # Validation schemas
│
├── config/
│   └── default.json             # Config par défaut
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 7. 🗄️ STOCKAGE

### 7.1 Choix: NDJSON (Fichiers)

**Pourquoi:**
- ✅ Simple et lisible
- ✅ Pas de dépendance database
- ✅ Facile à backup/restore
- ✅ Rapide pour lecture/écriture
- ✅ Compatible avec agents IA

**Structure:**
```
storage/
├── projects/
│   ├── amens/
│   │   ├── contacts.ndjson
│   │   ├── campaigns.ndjson
│   │   ├── interactions.ndjson
│   │   └── templates.ndjson
│   └── sitevitrine/
│       ├── contacts.ndjson
│       ├── campaigns.ndjson
│       ├── interactions.ndjson
│       └── templates.ndjson
```

### 7.2 Schema de Validation

```typescript
// Contact schema
const ContactSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string(),
  created_at: z.string().datetime(),
  standard_fields: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional()
  }),
  dynamic_fields: z.record(z.any()).optional(),
  metadata: z.object({
    source: z.string(),
    imported_at: z.string().datetime(),
    imported_by: z.string()
  }),
  stage: z.enum(['new', 'contacted', 'interested', 'converted', 'lost']),
  labels: z.array(z.string()),
  notes: z.string().optional()
});
```

---

## 8. ✅ CHECKLIST IMPLÉMENTATION

### Phase 1: Core (1 semaine)
- [ ] CLI setup (commandes de base)
- [ ] Project Manager (CRUD projets)
- [ ] Contact Manager (CRUD contacts)
- [ ] NDJSON Storage layer
- [ ] Config management

### Phase 2: Campaigns (1 semaine)
- [ ] Campaign Manager
- [ ] Template Manager
- [ ] Channel Manager (interface)
- [ ] Brevo SMS integration
- [ ] Retry logic + Rate limiting

### Phase 3: Agents (1 semaine)
- [ ] Hunter Agent (prospection)
- [ ] Seller Agent (vente)
- [ ] Agent runner CLI
- [ ] Logging + Debugging

### Phase 4: Email (1 semaine)
- [ ] Email provider interface
- [ ] Resend integration
- [ ] Template variables
- [ ] Tracking opens/clicks

---

## 9. 🎯 MÉTRIQUES DE SUCCÈS

| Métrique | Cible |
|----------|-------|
| **CLI Commands** | 100% fonctionnelles |
| **API Response Time** | < 100ms |
| **SMS Delivery Rate** | > 95% |
| **Email Delivery Rate** | > 90% |
| **Agent Success Rate** | > 80% |

---

## 10. ⚠️ RÈGLES DE SÉCURITÉ

### 10.1 Secrets

```bash
# ❌ JAMAIS dans Git
API_KEY=xxx
SECRET=xxx

# ✅ Dans .env (gitignored)
# ✅ Dans Vercel Dashboard
# ✅ Via agentcrm config set
```

### 10.2 Rate Limiting

```typescript
// Brevo SMS: 300 SMS/jour (gratuit)
const rateLimiter = new RateLimiter({
  max: 300,
  period: 'day'
});
```

### 10.3 Multi-Projets

```typescript
// Chaque agent DOIT spécifier son projet
const contacts = await contactManager.list({
  project_id: 'sitevitrine' // Obligatoire
});
```

---

## 11. 📝 EXEMPLES D'USAGE

### 11.1 Hunter Agent - Prospection

```bash
# 1. Import contacts scraped
agentcrm contact import \
  --file /tmp/google_maps_scrape.csv \
  --project sitevitrine \
  --source google_maps

# 2. Taguer comme hot leads
agentcrm contact update \
  --filter "website_status=no-website" \
  --labels "hot-lead,no-website" \
  --project sitevitrine

# 3. Créer campagne SMS
agentcrm campaign create \
  --name "SMS Batch 1 - $(date +%Y-%m-%d)" \
  --type sms \
  --project sitevitrine \
  --template "tpl_welcome_sms"

# 4. Ajouter contacts à campagne
agentcrm campaign add-contacts \
  --id camp001 \
  --filter "labels=hot-lead" \
  --limit 20

# 5. Lancer campagne
agentcrm campaign send --id camp001
```

### 11.2 Seller Agent - Suivi Ventes

```bash
# 1. Vérifier stats campagne
agentcrm campaign stats --id camp001 --json

# 2. Récupérer réponses
agentcrm campaign replies --id camp001 --json

# 3. Mettre à jour contacts intéressés
agentcrm contact update \
  --id c0001 \
  --stage interested \
  --notes "A répondu positivement"

# 4. Créer tâche de suivi
agentcrm task create \
  --contact_id c0001 \
  --type call \
  --due_date "2026-03-17T10:00:00Z" \
  --notes "Rappeler pour closing"
```

---

## 12. 🚀 DÉPLOIEMENT

### 12.1 Local Development

```bash
# 1. Clone
git clone https://github.com/Nadir-DNA/agentcrm.git
cd agentcrm

# 2. Install
npm install

# 3. Config
cp .env.example .env.local
# Éditer .env.local avec clés API

# 4. Run CLI
npm run cli -- project list
```

### 12.2 Vercel Deployment

```bash
# 1. Deploy CLI as serverless functions
vercel deploy --prod

# 2. Set environment variables
vercel env add BREVO_API_KEY production
vercel env add RESEND_API_KEY production

# 3. Test
agentcrm project list
```

---

**PRÊT À CODER**

**Prochaine action:** Commencer Phase 1 (Core CLI + Storage)
