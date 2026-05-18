# 🦀 AgentCRM - CRM pour AI Agents

> Système de gestion de prospects conçu pour l'automatisation par agents IA  
> **Version:** 1.0  
> **Date:** 2026-03-12  
> **Inspiration:** Amens + SiteVitrine

---

## 📋 Table des matières

1. [Vision](#1-vision)
2. [Architecture](#2-architecture)
3. [Modèle de données](#3-modèle-de-données)
4. [APIs & Intégrations](#4-apis--intégrations)
5. [Workflow Automation](#5-workflow-automation)
6. [Dashboard & Metrics](#6-dashboard--metrics)
7. [AI Agents](#7-ai-agents)
8. [Installation](#8-installation)

---

## 1. Vision

### 🎯 Problème actuel

Les CRM traditionnels (HubSpot, Salesforce, Pipedrive) sont conçus pour:
- ❌ Des humains qui cliquent
- ❌ Des interfaces graphiques complexes
- ❌ Des processus manuels
- ❌ Des notifications email ignorées

### ✅ Solution: AgentCRM

Un CRM conçu pour:
- ✅ Des AI Agents qui automatisent
- ✅ Des APIs et webhooks
- ✅ Des workflows autonomes
- ✅ Des actions programmées (SMS, email, calls)

---

## 2. Architecture

### 📁 Structure file-based (pas de SaaS)

```
~/agentcrm/
├── companies/                  # 1 dossier par entreprise
│   ├── amens/
│   │   ├── crm/
│   │   │   ├── contacts.ndjson
│   │   │   ├── pipeline.ndjson
│   │   │   ├── interactions.ndjson
│   │   │   ├── custom_fields.ndjson
│   │   │   └── config.yaml
│   │   └── automations/
│   │       ├── workflows.yaml
│   │       └── crons.yaml
│   └── sitevitrine/
│       └── crm/...
│
├── integrations/               # APIs configurées
│   ├── brevo.yaml
│   ├── resend.yaml
│   ├── twilio.yaml
│   └── vercel.yaml
│
├── agents/                     # AI Agents
│   ├── hunter/                 # Prospection
│   ├── madmen/                 # Marketing
│   └── seller/                 # Closing
│
└── dashboard/                  # Web UI
    └── index.html
```

### 🔧 Tech Stack

| Couche | Tech |
|--------|------|
| **Storage** | NDJSON (file-based, git-friendly) |
| **Backend** | Node.js + Express |
| **Frontend** | Next.js + Tailwind |
| **AI Agents** | OpenClaw subagents |
| **APIs** | REST + Webhooks |
| **Queue** | Bull (Redis) |

---

## 3. Modèle de données

### 📇 contacts.ndjson

```json
{
  "id": "c0001",
  "company_id": "amens",
  "created_at": "2026-03-12T00:00:00Z",
  "updated_at": "2026-03-12T01:00:00Z",
  
  "basic": {
    "name": "Maître Fiona SILES",
    "email": "contact@cabinet-dupont.fr",
    "phone": "+33614675809",
    "company": "Cabinet Dupont",
    "position": "Avocate",
    "address": "L'Astrolabe, 79 Bd de Dunkerque, 13001 Marseille"
  },
  
  "source": {
    "channel": "google_maps",
    "campaign": "marseille_avocats_2026_03",
    "imported_at": "2026-03-12T00:00:00Z",
    "imported_by": "hunter_agent"
  },
  
  "qualification": {
    "score": 85,
    "temperature": "hot",
    "budget": "299-999€",
    "decision_maker": true,
    "has_website": false,
    "employee_count": "1-5",
    "revenue_estimate": "50k-100k€"
  },
  
  "stage": {
    "pipeline_id": "p001",
    "stage_id": "new",
    "entered_at": "2026-03-12T00:00:00Z",
    "days_in_stage": 0,
    "next_action": "send_sms",
    "next_action_date": "2026-03-12T10:00:00Z"
  },
  
  "tags": ["hot-lead", "no-website", "avocat", "marseille", "google-maps"],
  
  "custom_fields": {
    "specialite": "Droit des affaires",
    "nombre_avis": 0,
    "note_google": "N/A",
    "concurrents": ["Cabinet X", "Cabinet Y"],
    "pain_points": ["Pas de site web", "Peu visible en ligne"]
  },
  
  "social": {
    "linkedin": "https://linkedin.com/in/...",
    "facebook": "",
    "instagram": "",
    "website": ""
  },
  
  "notes": "Prospect chaud - pas de site web. Spécialisé en droit des affaires.",
  "internal_notes": "À rappeler après 18h (dispo cabinet)"
}
```

### 💰 pipeline.ndjson

```json
{
  "id": "p001",
  "name": "SiteVitrine Sales Pipeline",
  "company_id": "sitevitrine",
  "created_at": "2026-03-12T00:00:00Z",
  
  "stages": [
    {
      "id": "new",
      "label": "🆕 Nouveau",
      "color": "#2563EB",
      "description": "Prospect importé, pas encore contacté",
      "auto_actions": ["assign_to_agent", "send_welcome_sms"],
      "sla_hours": 2
    },
    {
      "id": "contacted",
      "label": "📞 Contacté",
      "color": "#F59E0B",
      "description": "SMS/Email envoyé, en attente de réponse",
      "auto_actions": ["schedule_followup"],
      "sla_hours": 48
    },
    {
      "id": "interested",
      "label": "🎯 Intéressé",
      "color": "#10B981",
      "description": "Prospect intéressé, démo prévue",
      "auto_actions": ["create_deal", "schedule_demo"],
      "sla_hours": 24
    },
    {
      "id": "demo_scheduled",
      "label": "📅 Démo planifiée",
      "color": "#8B5CF6",
      "description": "Démo calée, en attente",
      "auto_actions": ["send_reminder_24h", "send_reminder_1h"],
      "sla_hours": 72
    },
    {
      "id": "negotiation",
      "label": "💰 Négociation",
      "color": "#EC4899",
      "description": "Discussion prix/options",
      "auto_actions": ["send_proposal"],
      "sla_hours": 168
    },
    {
      "id": "closed_won",
      "label": "✅ Vendu",
      "color": "#22C55E",
      "description": "Deal signé, à onboarder",
      "auto_actions": ["send_contract", "trigger_onboarding"],
      "sla_hours": null
    },
    {
      "id": "closed_lost",
      "label": "❌ Perdu",
      "color": "#6B7280",
      "description": "Prospect non intéressé",
      "auto_actions": ["send_thankyou", "schedule_recontact_6m"],
      "sla_hours": null
    }
  ],
  
  "default_stage": "new"
}
```

### 💬 interactions.ndjson

```json
{
  "id": "i0001",
  "contact_id": "c0001",
  "type": "sms_sent",
  "channel": "brevo",
  "direction": "outbound",
  "timestamp": "2026-03-12T10:00:00Z",
  
  "content": {
    "subject": "",
    "body": "Bonjour Maître,\n\nVotre site vitrine est prêt ! 🎉\n\n👉 https://generated-sites-five.vercel.app/site-c0001.html\n\nPrix: 299€ TTC\n\nRépondez OUI pour activer",
    "attachments": []
  },
  
  "metadata": {
    "campaign_id": "sms_batch_2026_03_12",
    "agent_id": "seller_agent",
    automation_id": "auto_sms_after_site_gen",
    "message_id": "brevo_msg_123456",
    "cost": 0.05,
    "currency": "EUR"
  },
  
  "status": {
    "sent": true,
    "delivered": true,
    "opened": null,
    "clicked": null,
    "replied": false
  },
  
  "user": "seller_agent",
  "notes": "SMS envoyé automatiquement après génération du site"
}
```

### ⚙️ config.yaml

```yaml
# Company: SiteVitrine
company_id: sitevitrine
company_name: SiteVitrine Automation

# Pipeline
pipeline:
  default_currency: EUR
  tax_rate: 0.20
  
# Stages SLA (en heures)
sla:
  new: 2
  contacted: 48
  interested: 24
  demo_scheduled: 72
  negotiation: 168
  
# Automations
automations:
  on_contact_created:
    - action: send_sms
      template: welcome_sms
      delay: 0h
    - action: assign_agent
      agent: seller_agent
      delay: 0h
    - action: generate_site
      template: default
      delay: 1h
  
  on_stage_change:
    from: contacted
    to: interested
    actions:
      - action: create_deal
        value: 299
      - action: schedule_demo
        delay: 24h
  
  followup:
    enabled: true
    intervals: [24h, 72h, 168h]
    channel: sms
    max_attempts: 3
  
# Custom fields
custom_fields:
  - id: specialite
    label: Spécialité
    type: text
    required: false
    
  - id: nombre_avis
    label: Nombre d'avis Google
    type: number
    required: false
    
  - id: note_google
    label: Note Google
    type: rating
    min: 0
    max: 5
    required: false
    
  - id: concurrents
    label: Concurrents directs
    type: multi_text
    required: false
    
  - id: pain_points
    label: Points de douleur
    type: multi_text
    required: false

# Notifications
notifications:
  slack:
    enabled: true
    webhook: https://hooks.slack.com/...
    events:
      - deal_closed_won
      - deal_closed_lost
      - sla_breach
    
  email:
    enabled: true
    provider: resend
    from: noreply@sitevitrine.fr
    
  sms:
    enabled: true
    provider: brevo
    from: SiteVitrine
```

---

## 4. APIs & Intégrations

### 🔌 APIs supportées

| API | Usage | Config |
|-----|-------|--------|
| **Brevo** | SMS marketing | `integrations/brevo.yaml` |
| **Resend** | Email transactionnel | `integrations/resend.yaml` |
| **Twilio** | SMS + Voice (US) | `integrations/twilio.yaml` |
| **Vercel** | Déploiement auto | `integrations/vercel.yaml` |
| **Google Maps** | Scraping prospects | `integrations/google.yaml` |
| **LinkedIn** | Enrichissement B2B | `integrations/linkedin.yaml` |
| **Clearbit** | Data enrichment | `integrations/clearbit.yaml` |
| **Slack** | Notifications | `integrations/slack.yaml` |

### 📝 Exemple: integrations/brevo.yaml

```yaml
provider: brevo
name: Brevo SMS
enabled: true

auth:
  type: api_key
  key_env: BREVO_API_KEY
  
endpoints:
  send_sms: https://api.brevo.com/v3/smssenders
  get_balance: https://api.brevo.com/v3/account
  
templates:
  welcome_sms:
    from: SiteVitrine
    body: |
      Bonjour {{contact.first_name}},
      
      Votre site vitrine est prêt ! 🎉
      
      👉 {{site_url}}
      
      Prix: 299€ TTC
      
      Répondez OUI pour activer
      
  followup_sms:
    from: SiteVitrine
    body: |
      Bonjour {{contact.first_name}},
      
      Avez-vous pu consulter votre site ?
      
      👉 {{site_url}}
      
      Je suis dispo pour en discuter !
      
      L'équipe SiteVitrine
  
limits:
  daily_sms: 1000
  monthly_sms: 30000
  rate_limit: 10/minute
  
webhooks:
  enabled: true
  events:
    - sms.delivered
    - sms.failed
    - sms.replied
  endpoint: /api/webhooks/brevo
```

### 🔗 Webhooks

```yaml
# Webhooks entrants
webhooks:
  brevo:
    path: /api/webhooks/brevo
    events:
      sms.delivered: update_interaction_status
      sms.failed: notify_agent
      sms.replied: create_interaction + notify_agent
      
  resend:
    path: /api/webhooks/resend
    events:
      email.sent: update_interaction_status
      email.opened: update_contact_score
      email.clicked: update_contact_score
      
  stripe:
    path: /api/webhooks/stripe
    events:
      payment.succeeded: move_stage_to_closed_won
      payment.failed: notify_agent
      
  vercel:
    path: /api/webhooks/vercel
    events:
      deployment.succeeded: notify_prospect
      deployment.failed: notify_agent
```

---

## 5. Workflow Automation

### 🔄 Workflows types

#### Workflow 1: Nouveau prospect → Site généré → SMS

```yaml
name: Site Generation Flow
trigger: contact_created
conditions:
  - field: tags
    operator: contains
    value: no-website
    
steps:
  - id: generate_site
    action: http_request
    url: http://localhost:3000/api/generate-site
    method: POST
    body:
      contact_id: {{contact.id}}
      template: default
    timeout: 300s
    
  - id: deploy_site
    action: http_request
    url: http://localhost:3000/api/deploy-vercel
    method: POST
    body:
      site_file: {{generate_site.output.filename}}
    depends_on: generate_site
    
  - id: send_sms
    action: brevo_send_sms
    template: welcome_sms
    to: {{contact.phone}}
    variables:
      site_url: {{deploy_site.output.url}}
    depends_on: deploy_site
    
  - id: log_interaction
    action: create_interaction
    type: sms_sent
    contact_id: {{contact.id}}
    metadata:
      campaign_id: auto_site_gen
      site_url: {{deploy_site.output.url}}
    depends_on: send_sms
```

#### Workflow 2: Relance automatique (no response)

```yaml
name: Follow-up Sequence
trigger: stage_changed_to_contacted
schedule:
  intervals: [24h, 72h, 168h]
  max_attempts: 3
  
conditions:
  - field: last_interaction.replied
    operator: equals
    value: false
    
steps:
  - id: send_followup
    action: brevo_send_sms
    template: followup_sms
    to: {{contact.phone}}
    
  - id: log_attempt
    action: create_interaction
    type: followup_attempt
    contact_id: {{contact.id}}
    notes: "Tentative {{schedule.attempt_number}}/3"
    
  - id: escalate
    action: notify_agent
    agent: seller_agent
    message: "Prospect {{contact.name}} ne répond pas après 3 relances"
    condition:
      field: schedule.attempt_number
      operator: equals
      value: 3
```

#### Workflow 3: Enrichissement automatique des données

```yaml
name: Lead Enrichment
trigger: contact_created
async: true

steps:
  - id: google_search
    action: http_request
    url: https://www.googleapis.com/customsearch/v1
    params:
      q: "{{contact.company}} {{contact.address}}"
    output_key: google_results
    
  - id: extract_website
    action: javascript
    code: |
      const results = steps.google_results.output.items || [];
      return results.find(r => !r.link.includes('google'))?.link || '';
    output_key: website_url
    
  - id: update_contact
    action: update_contact
    contact_id: {{contact.id}}
    data:
      custom_fields:
        website_found: {{extract_website.output}}
        
  - id: has_website_tag
    action: add_tag
    contact_id: {{contact.id}}
    tag: has-website
    condition:
      field: extract_website.output
      operator: not_empty
```

---

## 6. Dashboard & Metrics

### 📊 KPIs à tracker

#### Pipeline Metrics

```yaml
metrics:
  pipeline_velocity:
    formula: total_deal_value / avg_days_in_pipeline
    target: "> 1000€/jour"
    
  conversion_rate:
    formula: closed_won / (closed_won + closed_lost)
    target: "> 10%"
    
  avg_deal_size:
    formula: sum(closed_won.value) / count(closed_won)
    target: "299€"
    
  sla_compliance:
    formula: contacts_within_sla / total_contacts
    target: "> 95%"
```

#### Agent Performance

```yaml
agent_metrics:
  hunter:
    - prospects_imported_per_day
    - enrichment_accuracy
    - cost_per_lead
    
  seller:
    - sms_sent_per_day
    - response_rate
    - deals_closed
    - avg_response_time
    
  madmen:
    - emails_sent
    - open_rate
    - click_rate
    - unsubscribe_rate
```

### 🖥️ Dashboard UI

```
┌─────────────────────────────────────────────────────────────┐
│  🦀 AgentCRM Dashboard                    [SiteVitrine ▼]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 PIPELINE OVERVIEW                                       │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────────┐  │
│  │   New   │Contacted│Interested│  Demo  │    Won      │  │
│  │   165   │    42   │    15   │    8    │      3      │  │
│  │         │         │         │         │   897€ 💰   │  │
│  └─────────┴─────────┴─────────┴─────────┴─────────────┘  │
│                                                             │
│  📈 CONVERSION FUNNEL                                       │
│  ████████████████████████████████████░░░░░ 100% (165)      │
│  ████████████████████████░░░░░░░░░░░░░░░░░  65% (107)      │
│  ██████████████████░░░░░░░░░░░░░░░░░░░░░░░  45% (74)       │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░  38% (63)       │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  18% (30)       │
│                                                             │
│  ⚠️ SLA ALERTS (3)                                          │
│  • c0042 - Dans "New" depuis 4h (SLA: 2h)                  │
│  • c0089 - Dans "Contacted" depuis 52h (SLA: 48h)          │
│  • c0103 - Dans "Demo" depuis 80h (SLA: 72h)               │
│                                                             │
│  🤖 AGENT ACTIVITY (24h)                                    │
│  ┌────────────┬──────────┬───────────┬────────────┐        │
│  │   Agent    │  Actions │  Deals    │   Score    │        │
│  ├────────────┼──────────┼───────────┼────────────┤        │
│  │ seller_01  │   342    │    12     │   94% 🟢   │        │
│  │ hunter_01  │   156    │     -     │   87% 🟢   │        │
│  │ madmen_01  │    89    │     3     │   91% 🟢   │        │
│  └────────────┴──────────┴───────────┴────────────┘        │
│                                                             │
│  💰 REVENUE THIS MONTH                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Target: 10 000€                                    │   │
│  │  ████████████████████░░░░░░░░░░░░░░░░  4 587€ (46%)│   │
│  │  Closed: 15 deals | Avg: 306€                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. AI Agents

### 🤖 Agent Types

#### Hunter Agent (Prospection)

```yaml
agent_id: hunter
name: Hunter Agent
role: prospecting
capabilities:
  - scrape_google_maps
  - scrape_pagesjaunes
  - enrich_contact_data
  - qualify_lead
  - add_to_crm
  
triggers:
  - schedule: "0 6 * * *"  # 6h every day
  - manual: true
  
goals:
  - import 100 new prospects/day
  - enrichment_accuracy > 90%
  - cost_per_lead < 0.10€
  
tools:
  - google_maps_scraper
  - clearbit_api
  - crm_create_contact
```

#### Seller Agent (Closing)

```yaml
agent_id: seller
name: Seller Agent
role: sales
capabilities:
  - send_sms
  - send_email
  - schedule_demo
  - negotiate_price
  - close_deal
  
triggers:
  - contact_created
  - stage_changed
  - schedule: "*/30 * * * *"  # Every 30 min
  
goals:
  - response_time < 5min
  - conversion_rate > 10%
  - deals_closed > 20/month
  
tools:
  - brevo_sms
  - resend_email
  - cal_com_api
  - stripe_payment
```

#### Madmen Agent (Marketing)

```yaml
agent_id: madmen
name: Madmen Agent
role: marketing
capabilities:
  - create_email_campaign
  - segment_contacts
  - ab_test_content
  - track_analytics
  
triggers:
  - schedule: "0 9 * * 1"  # Monday 9am
  - pipeline_threshold: 50  # When 50+ contacts in pipeline
  
goals:
  - email_open_rate > 40%
  - click_rate > 15%
  - unsubscribe_rate < 2%
  
tools:
  - resend_bulk
  - analytics_dashboard
  - ab_test_runner
```

### 🧠 Agent Decision Tree

```yaml
# Seller Agent decision logic
decision_tree:
  on_contact_created:
    if:
      - contact.score >= 80
    then:
      - send_sms_immediately
      - schedule_call_24h
      
    if:
      - contact.score >= 50
      - contact.score < 80
    then:
      - send_email
      - schedule_followup_48h
      
    if:
      - contact.score < 50
    then:
      - add_to_nurture_campaign
      - no_immediate_action
      
  on_sms_no_response:
    if:
      - attempt_count == 1
    then:
      - wait_24h
      - send_followup_sms
      
    if:
      - attempt_count == 2
    then:
      - wait_72h
      - send_email
      
    if:
      - attempt_count == 3
    then:
      - mark_as_cold
      - notify_human
```

---

## 8. Installation

### 📦 Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/agentcrm.git
cd agentcrm

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your API keys

# 4. Create first company
npm run company:create -- --name=sitevitrine

# 5. Start dashboard
npm run dev

# 6. Start agents
npm run agents:start
```

### 🔑 Environment Variables

```bash
# .env
NODE_ENV=development

# CRM
CRM_STORAGE_PATH=./companies

# APIs
BREVO_API_KEY=xkeysib-...
RESEND_API_KEY=re_...
TWILIO_SID=AC...
TWILIO_TOKEN=...
VERCEL_TOKEN=...

# AI Agents
OPENCLAW_API_KEY=...
OPENAI_API_KEY=sk-...

# Dashboard
DASHBOARD_PORT=3000
DASHBOARD_SECRET=changeme

# Queue (Redis)
REDIS_URL=redis://localhost:6379
```

### 🚀 Commands

```bash
# Company management
npm run company:create -- --name=mycompany
npm run company:list
npm run company:delete -- --name=mycompany

# Data import
npm run import:csv -- --file=prospects.csv --company=mycompany
npm run import:google-sheets -- --url=... --company=mycompany

# Automation
npm run workflow:run -- --name=site-generation --contact=c0001
npm run workflow:list

# Agents
npm run agents:start
npm run agents:status
npm run agents:stop

# Dashboard
npm run dev          # Local dev
npm run build        # Production build
npm run start        # Production start

# Metrics
npm run metrics:export -- --format=json --output=report.json
npm run metrics:dashboard
```

---

## Annexes

### A. Templates SMS

```yaml
templates:
  welcome_sms:
    name: Welcome SMS
    body: |
      Bonjour {{contact.first_name}},
      
      Votre site vitrine est prêt ! 🎉
      
      👉 {{site_url}}
      
      Prix: 299€ TTC
      
      Répondez OUI pour activer
      
  followup_24h:
    name: Follow-up 24h
    body: |
      Bonjour {{contact.first_name}},
      
      Avez-vous pu consulter votre site ?
      
      👉 {{site_url}}
      
      Je suis dispo pour en discuter !
      
      L'équipe SiteVitrine
      
  demo_reminder:
    name: Demo Reminder
    body: |
      Bonjour {{contact.first_name}},
      
      Rappel: Démo SiteVitrine aujourd'hui à {{demo_time}}
      
      Lien: {{demo_link}}
      
      À tout de suite !
```

### B. Templates Email

```yaml
templates:
  proposal_email:
    subject: "Votre proposition SiteVitrine - {{contact.company}}"
    body: |
      Bonjour {{contact.first_name}},
      
      Suite à notre échange, voici votre proposition personnalisée:
      
      📦 Pack Site Vitrine
      - Site one-page design premium
      - Hébergement Vercel inclus
      - Nom de domaine personnalisé
      - Formulaire de contact
      - SEO optimisé
      
      💰 Tarif: 299€ TTC (au lieu de 999€)
      
      ⏱️ Délai: 48h après validation
      
      Pour accepter, répondez simplement à cet email.
      
      Bien cordialement,
      L'équipe SiteVitrine
```

### C. API Endpoints

```yaml
endpoints:
  # Contacts
  POST /api/contacts: Create contact
  GET /api/contacts: List contacts
  GET /api/contacts/:id: Get contact
  PUT /api/contacts/:id: Update contact
  DELETE /api/contacts/:id: Delete contact
  
  # Pipeline
  GET /api/pipeline: Get pipeline stages
  PUT /api/contacts/:id/stage: Move contact to stage
  
  # Interactions
  POST /api/interactions: Log interaction
  GET /api/contacts/:id/interactions: Get contact history
  
  # Automations
  POST /api/workflows/:id/run: Trigger workflow
  GET /api/workflows: List workflows
  
  # Webhooks
  POST /api/webhooks/brevo: Brevo webhook
  POST /api/webhooks/resend: Resend webhook
  POST /api/webhooks/stripe: Stripe webhook
  
  # Metrics
  GET /api/metrics: Get all metrics
  GET /api/metrics/pipeline: Pipeline metrics
  GET /api/metrics/agents: Agent performance
```

---

**🦀 AgentCRM v1.0 - Documenté par AgentViz**  
*Last updated: 2026-03-12*
