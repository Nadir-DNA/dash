# Guide: Configure Workflows (YAML)

Workflows automate what happens to contacts as they move through the pipeline. Each company has its own `automations/workflows.yaml` file.

---

## File Location

```
companies/
└── <company>/
    └── automations/
        └── workflows.yaml
```

Create the directory if it doesn't exist:

```bash
mkdir -p companies/mycompany/automations
touch companies/mycompany/automations/workflows.yaml
```

---

## Workflow Structure

A `workflows.yaml` file contains a list of named workflows. Each workflow has:

- **trigger** — when the workflow fires
- **conditions** — optional filters (stage, tag, field value)
- **actions** — what to do (send SMS, send email, move stage, add tag, etc.)

```yaml
workflows:
  - name: welcome_new_contact
    trigger:
      event: contact.created
    actions:
      - type: send_email
        template: welcome
        delay: 0

  - name: followup_after_contact
    trigger:
      event: stage.entered
      stage: contacted
    actions:
      - type: send_sms
        message: "Bonjour {{contact.basic.name}}, avez-vous eu le temps de regarder notre offre ?"
        delay: 48h

  - name: demo_reminder
    trigger:
      event: stage.entered
      stage: demo
    conditions:
      - field: contact.basic.phone
        operator: exists
    actions:
      - type: send_sms
        message: "Rappel : votre démo AgentViz est confirmée. Répondez OUI pour confirmer."
        delay: 24h
      - type: add_tag
        tag: demo_reminded

  - name: sla_alert
    trigger:
      event: sla.breach
    actions:
      - type: assign_agent
        agent: seller
      - type: add_tag
        tag: sla_breached
```

---

## Triggers

| Trigger event | Description |
|---------------|-------------|
| `contact.created` | Fires when a new contact is added |
| `contact.updated` | Fires on any field update |
| `stage.entered` | Fires when a contact enters a specific stage |
| `stage.left` | Fires when a contact leaves a specific stage |
| `sla.breach` | Fires when a contact exceeds the stage SLA |
| `tag.added` | Fires when a specific tag is applied |
| `cron` | Scheduled trigger (see Cron Workflows below) |

### Stage trigger example

```yaml
trigger:
  event: stage.entered
  stage: interested     # only fires for the "interested" stage
```

---

## Conditions

Filter which contacts trigger the actions:

```yaml
conditions:
  - field: contact.basic.phone
    operator: exists

  - field: contact.tags
    operator: contains
    value: vip

  - field: contact.basic.company
    operator: equals
    value: "Amens"
```

| Operator | Description |
|----------|-------------|
| `exists` | Field is present and non-empty |
| `not_exists` | Field is absent or empty |
| `equals` | Exact match |
| `not_equals` | Does not match |
| `contains` | String/array contains value |
| `starts_with` | String starts with value |

---

## Actions

### `send_sms`

Uses Brevo (requires `BREVO_API_KEY` in `.env`).

```yaml
- type: send_sms
  message: "Bonjour {{contact.basic.name}}, merci de votre intérêt !"
  delay: 0          # send immediately
  # delay: 2h       # delay 2 hours
  # delay: 1d       # delay 1 day
```

Available template variables: `{{contact.basic.name}}`, `{{contact.basic.email}}`, `{{contact.basic.phone}}`, `{{contact.basic.company}}`, `{{contact.id}}`.

### `send_email`

Uses Resend (requires `RESEND_API_KEY` in `.env`).

```yaml
- type: send_email
  template: welcome          # template name in templates/
  subject: "Bienvenue chez AgentViz"
  delay: 0
```

Or inline:

```yaml
- type: send_email
  subject: "Suivi de votre demande"
  body: "Bonjour {{contact.basic.name}},\n\nNous avons bien reçu votre demande..."
  delay: 1d
```

### `move_stage`

```yaml
- type: move_stage
  stage: interested
```

### `add_tag`

```yaml
- type: add_tag
  tag: hot_lead
```

### `remove_tag`

```yaml
- type: remove_tag
  tag: cold_lead
```

### `assign_agent`

```yaml
- type: assign_agent
  agent: seller       # hunter | seller | madmen
```

### `webhook`

```yaml
- type: webhook
  url: https://hooks.zapier.com/hooks/catch/xxx/yyy
  method: POST
  payload:
    contact_id: "{{contact.id}}"
    stage: "{{contact.stage.stage_id}}"
```

---

## Cron Workflows

Run actions on a schedule (independent of contact events):

```yaml
workflows:
  - name: weekly_inactive_followup
    trigger:
      event: cron
      schedule: "0 9 * * 1"    # Every Monday at 9am
    actions:
      - type: run_agent
        agent: seller
        task: followup_inactive
        filter:
          stage: contacted
          last_updated_days_ago: 7
```

Cron uses standard 5-field cron syntax (`minute hour day month weekday`).

---

## SLA Tracking

The pipeline has built-in SLA timers per stage. When a contact exceeds the SLA, the `sla.breach` event fires.

| Stage | Default SLA |
|-------|-------------|
| `new` | 2 hours |
| `contacted` | 48 hours |
| `interested` | 24 hours |
| `demo` | 72 hours |
| `negotiation` | 168 hours (7 days) |

Override SLA in the pipeline config (future feature — currently set in `src/lib/pipeline.js`).

**Example: alert on SLA breach**

```yaml
- name: sla_new_contact
  trigger:
    event: sla.breach
    stage: new
  actions:
    - type: assign_agent
      agent: hunter
    - type: add_tag
      tag: needs_attention
    - type: send_email
      subject: "⚠️ SLA breach: new contact uncontacted"
      template: sla_alert
```

---

## Full Example: Amens Onboarding Flow

```yaml
# companies/amens/automations/workflows.yaml

workflows:
  - name: welcome_sms
    trigger:
      event: contact.created
    conditions:
      - field: contact.basic.phone
        operator: exists
    actions:
      - type: send_sms
        message: "Bonjour {{contact.basic.name}} ! Bienvenue chez Amens. Nous vous recontactons très vite."
        delay: 0

  - name: followup_48h
    trigger:
      event: stage.entered
      stage: contacted
    actions:
      - type: send_sms
        message: "Bonjour {{contact.basic.name}}, avez-vous des questions sur notre offre bien-être ?"
        delay: 48h

  - name: demo_sequence
    trigger:
      event: stage.entered
      stage: interested
    actions:
      - type: send_email
        template: demo_invite
        delay: 0
      - type: move_stage
        stage: demo
        delay: 2d

  - name: sla_breach_escalate
    trigger:
      event: sla.breach
    actions:
      - type: assign_agent
        agent: seller
      - type: add_tag
        tag: urgent
```

---

## Applying Workflows

After editing `workflows.yaml`, restart the agents to pick up the changes:

```bash
npm run agents:start
```

Or trigger a reload (if the agent watcher is running):

```bash
curl -X POST http://localhost:3000/api/agents/reload
```

---

## Troubleshooting

**Workflow doesn't fire**
→ Check the trigger event name and stage ID match exactly (case-sensitive).

**SMS not sending**
→ Verify `BREVO_API_KEY` is set in `.env` and the contact has a `phone` field.

**Email not sending**
→ Verify `RESEND_API_KEY` is set and the template file exists in `templates/`.

**Cron not running**
→ Agents must be running (`npm run agents:start`). The cron scheduler is part of the agent process.

**Template variables showing as `{{...}}`**
→ The field path doesn't exist on the contact. Check field names with `GET /api/companies/:id/contacts/:cid`.
