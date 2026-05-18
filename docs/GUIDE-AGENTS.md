# Guide: Using AI Agents (Hunter, Seller, Madmen)

AgentCRM ships with three AI agents designed to automate your sales pipeline end-to-end. Each agent has a specific role and can run autonomously or be triggered manually.

---

## Overview

| Agent | Role | When to use |
|-------|------|-------------|
| **Hunter** | Prospecting — finds and qualifies new leads | Filling the top of the funnel |
| **Seller** | Closing & follow-up — moves contacts through stages | Converting interested leads |
| **Madmen** | Marketing campaigns — bulk SMS/email | Broad outreach & re-engagement |

---

## Starting Agents

Start all agents at once:

```bash
npm run agents:start
```

Start a specific agent:

```bash
node src/agents/hunter.js --company=mycompany
node src/agents/seller.js --company=mycompany
node src/agents/madmen.js --company=mycompany
```

Stop agents: `Ctrl+C` or kill the process.

---

## Hunter — Automatic Prospecting

Hunter finds new prospects and qualifies them before they enter the pipeline.

### What Hunter does

1. Reads the target criteria from `automations/hunter.yaml`
2. Searches for matching prospects (via configured sources)
3. Creates contacts in the CRM with stage `new`
4. Enriches contact data (company, website, phone) when available
5. Applies initial tags based on source and criteria

### Configure Hunter

```yaml
# companies/mycompany/automations/hunter.yaml

hunter:
  company: mycompany
  sources:
    - type: csv
      path: ./prospects/incoming.csv    # Watch this folder for new CSVs
    - type: webhook
      endpoint: /api/webhooks/hunter    # External sources POST here
  criteria:
    - field: basic.email
      operator: exists
    - field: basic.phone
      operator: exists
  auto_tag:
    - hunter_imported
  on_duplicate: skip    # skip | update
```

### Manual trigger via API

```bash
# Trigger Hunter to process any pending sources
curl -X POST http://localhost:3000/api/agents/hunter/run \
  -H "Content-Type: application/json" \
  -d '{"company":"mycompany"}'
```

### Hunter output

After a run, Hunter logs:

```
🔍 Hunter run — mycompany
  Processed: 3 sources
  New contacts: 47
  Skipped (duplicates): 12
  Enriched: 31 (66%)
  → Pipeline stage: new
```

---

## Seller — Closing & Follow-up

Seller monitors the pipeline and takes action on contacts that need follow-up. It never lets a hot lead go cold.

### What Seller does

1. Scans all contacts for SLA breaches or follow-up triggers
2. Sends personalised SMS/email based on the contact's current stage
3. Moves contacts to the next stage when conditions are met
4. Escalates stalled contacts with an urgent tag

### Configure Seller

```yaml
# companies/mycompany/automations/seller.yaml

seller:
  company: mycompany
  check_interval: 1h    # how often Seller scans contacts
  stages:
    new:
      action: send_sms
      message: "Bonjour {{contact.basic.name}}, votre site vitrine est prêt à être créé !"
      advance_to: contacted
      advance_after: sent
    contacted:
      action: send_sms
      message: "Bonjour {{contact.basic.name}}, avez-vous eu le temps de regarder notre offre ?"
      advance_to: interested
      advance_after: reply_received
      sla_escalate: seller
    interested:
      action: send_email
      template: demo_invite
      advance_to: demo
    demo:
      action: send_sms
      message: "Rappel : votre démo est demain à 10h. Répondez OUI pour confirmer."
      advance_to: negotiation
    negotiation:
      action: assign_human
      note: "Contact in negotiation — human follow-up required"
```

### Manual trigger

```bash
curl -X POST http://localhost:3000/api/agents/seller/run \
  -H "Content-Type: application/json" \
  -d '{"company":"mycompany","stage":"contacted"}'
```

### Seller output

```
💼 Seller run — mycompany
  Scanned: 89 contacts
  Actions taken: 12
    - 5 × send_sms (new → contacted)
    - 4 × send_sms (contacted → follow-up)
    - 3 × send_email (interested → demo invite)
  SLA breaches: 2 (tagged: urgent)
```

---

## Madmen — Marketing Campaigns

Madmen runs bulk outreach campaigns. Unlike Seller (which focuses on individual follow-up), Madmen blasts a message to a segment of your contacts.

### What Madmen does

1. Reads a campaign definition from `automations/campaigns.yaml`
2. Filters contacts by stage, tag, or custom criteria
3. Sends SMS (Brevo) or email (Resend) to matching contacts
4. Records each send in `interactions.ndjson`
5. Respects opt-out tags (`unsubscribed`, `no_contact`)

### Configure a campaign

```yaml
# companies/mycompany/automations/campaigns.yaml

campaigns:
  - name: march_promo_sms
    agent: madmen
    channel: sms
    message: "🌸 Offre printemps : votre site vitrine à 249€ au lieu de 299€. Valable jusqu'au 31 mars. Répondez OUI pour en savoir plus."
    filter:
      stage:
        - new
        - contacted
      exclude_tags:
        - unsubscribed
        - no_contact
    schedule: "2026-03-20T09:00:00"    # ISO datetime or cron
    max_sends: 500                       # safety cap

  - name: reactivation_email
    agent: madmen
    channel: email
    template: reactivation
    subject: "On ne vous a pas oublié 👋"
    filter:
      stage:
        - closed_lost
      last_interaction_days_ago_min: 30
    schedule: "0 10 * * 1"              # Every Monday 10am
```

### Run a campaign manually

```bash
# Dry run (preview without sending)
curl -X POST http://localhost:3000/api/agents/madmen/campaign \
  -H "Content-Type: application/json" \
  -d '{"company":"mycompany","campaign":"march_promo_sms","dry_run":true}'

# Live run
curl -X POST http://localhost:3000/api/agents/madmen/campaign \
  -H "Content-Type: application/json" \
  -d '{"company":"mycompany","campaign":"march_promo_sms"}'
```

### Madmen output

```
📣 Madmen campaign — march_promo_sms
  Matched: 127 contacts
  Excluded (unsubscribed/no_contact): 8
  Sent: 119
    - 119 × SMS via Brevo
  Failed: 2 (invalid phone numbers)
  Recorded in interactions.ndjson ✅
```

---

## Interaction Logging

Every agent action is recorded in `companies/<company>/crm/interactions.ndjson`:

```json
{"id":"i0001","contact_id":"c0042","company_id":"mycompany","agent":"seller","type":"sms","status":"sent","message":"Bonjour Marie...","created_at":"2026-03-17T09:00:00.000Z"}
{"id":"i0002","contact_id":"c0042","company_id":"mycompany","agent":"madmen","type":"email","status":"sent","template":"reactivation","created_at":"2026-03-20T10:00:00.000Z"}
```

Query interactions via API (future endpoint — currently read directly from NDJSON).

---

## Opt-out Handling

Contacts tagged `unsubscribed` or `no_contact` are automatically excluded from all agent-initiated sends.

To opt out a contact:

```bash
curl -X PUT http://localhost:3000/api/companies/mycompany/contacts/c0042 \
  -H "Content-Type: application/json" \
  -d '{"tags":["unsubscribed"]}'
```

---

## Typical Full Pipeline (Amens Example)

```
1. Hunter imports 165 prospects from CSV
      → all contacts created at stage: new

2. Seller detects 165 contacts at stage "new"
      → sends welcome SMS to each
      → advances to stage: contacted

3. Seller (next run, 48h later)
      → contacts still at "contacted" → follow-up SMS
      → contacts who replied → advances to "interested"

4. Madmen (weekly Monday 9am)
      → sends promo email to all "new" + "contacted"
      → re-engages cold leads

5. Seller handles "interested" contacts
      → sends demo invite email
      → advances to "demo"

Result: 10–20 conversions @ 299€
```

---

## Troubleshooting

**Agent starts but does nothing**
→ Check that the company has contacts: `curl .../api/companies/mycompany/contacts`

**SMS not sent**
→ Verify `BREVO_API_KEY` is set. Check that contacts have `basic.phone` populated.

**Email not sent**
→ Verify `RESEND_API_KEY` is set. Check that contacts have `basic.email` populated.

**Agent keeps re-sending to the same contacts**
→ Check interaction log in `interactions.ndjson`. If actions aren't being recorded, the agent may not be persisting state correctly.

**Campaign sent to opted-out contacts**
→ Ensure those contacts have the tag `unsubscribed` or `no_contact` (exact spelling, lowercase).
