# Guide: Import Contacts

This guide explains how to add contacts to AgentCRM — via CSV file, manual API call, or Google Sheets export.

---

## Option 1: CSV Import (recommended for bulk)

### Prepare your CSV

The CSV must have a header row. Supported columns:

| Column | Required | Description |
|--------|----------|-------------|
| `name` | ✅ | Full name |
| `email` | ✅ (or name) | Email address |
| `phone` | | Phone number (E.164 format: +33612345678) |
| `company` | | Company name |
| `website` | | Website URL |
| `stage` | | Pipeline stage ID (default: `new`) |
| `tags` | | Comma-separated tags |
| `notes` | | Free text notes |

**Example CSV:**

```csv
name,email,phone,company,website,stage,tags
Marie Dupont,marie@example.com,+33612345678,Amens,https://amens.fr,new,prospect
Jean Martin,jean@cabinet.fr,,Cabinet Martin,,contacted,client
Sophie Bernard,sophie@sophie.fr,+33698765432,Auto-entrepreneur,,,vip,lead
```

### Run the import

```bash
npm run import:csv -- --company=mycompany --file=./contacts.csv
```

Or via CLI shorthand:

```bash
node src/cli/import-csv.js --company=amens --file=./my-prospects.csv
```

**Output:**

```
✅ Imported 3 contacts into "amens"
  - Marie Dupont (marie@example.com) → stage: new
  - Jean Martin (jean@cabinet.fr) → stage: contacted
  - Sophie Bernard (sophie@sophie.fr) → stage: new
⚠️  0 skipped (duplicates)
```

### Duplicate handling

Contacts with an existing `email` are skipped (not overwritten). Use `--upsert` flag to update existing contacts instead of skipping.

---

## Option 2: Google Sheets Export

Google Sheets doesn't export directly to AgentCRM, but the workflow is straightforward:

1. In Google Sheets, go to **File → Download → Comma-separated values (.csv)**
2. Save the file locally (e.g., `prospects.csv`)
3. Ensure the header row matches the column names above (rename if needed)
4. Run the CSV import:

```bash
npm run import:csv -- --company=sitevitrine --file=~/Downloads/prospects.csv
```

**Tip:** Name your sheet columns to match AgentCRM fields (`name`, `email`, `phone`, etc.) to avoid having to rename the header row.

---

## Option 3: Manual API — Create one contact

```bash
curl -X POST http://localhost:3000/api/companies/mycompany/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "basic": {
      "name": "Marie Dupont",
      "email": "marie@example.com",
      "phone": "+33612345678",
      "company": "Amens"
    },
    "tags": ["prospect", "web"],
    "notes": "Rencontrée au salon du bien-être"
  }'
```

**Response:**

```json
{
  "id": "c0001",
  "company_id": "mycompany",
  "created_at": "2026-03-17T10:00:00.000Z",
  "updated_at": "2026-03-17T10:00:00.000Z",
  "stage": { "stage_id": "new", "entered_at": "2026-03-17T10:00:00.000Z" },
  "tags": ["prospect", "web"],
  "basic": {
    "name": "Marie Dupont",
    "email": "marie@example.com",
    "phone": "+33612345678",
    "company": "Amens"
  }
}
```

---

## Option 4: Bulk API — Create multiple contacts via script

```js
const contacts = [
  { basic: { name: "Alice", email: "alice@example.com" } },
  { basic: { name: "Bob",   email: "bob@example.com"   } },
];

for (const contact of contacts) {
  await fetch('http://localhost:3000/api/companies/mycompany/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact),
  });
}
```

---

## Viewing imported contacts

```bash
# List all contacts
curl http://localhost:3000/api/companies/mycompany/contacts

# Filter by stage
curl "http://localhost:3000/api/companies/mycompany/contacts?stage=new"

# Search by name/email/company
curl "http://localhost:3000/api/companies/mycompany/contacts?q=marie"

# Filter by tag
curl "http://localhost:3000/api/companies/mycompany/contacts?tag=prospect"
```

---

## Pipeline stages

After import, contacts default to stage `new`. Move them manually or let agents handle progression:

| Stage ID | Label | SLA |
|----------|-------|-----|
| `new` | Nouveau | 2h |
| `contacted` | Contacté | 48h |
| `interested` | Intéressé | 24h |
| `demo` | Démo planifiée | 72h |
| `negotiation` | Négociation | 7 days |
| `closed_won` | Vendu | — |
| `closed_lost` | Perdu | — |

```bash
# Move a contact to "interested"
curl -X PUT http://localhost:3000/api/companies/mycompany/contacts/c0001/stage \
  -H "Content-Type: application/json" \
  -d '{"stage_id":"interested"}'
```

---

## Troubleshooting

**"Company not found"**
→ Create the company first: `npm run company:create -- --name=mycompany`

**CSV import produces 0 contacts**
→ Check the header row matches expected column names. Headers are case-sensitive.

**Contacts appear but have no email**
→ Ensure your CSV has an `email` column (not `Email` or `e-mail`).

**Duplicate contacts after re-import**
→ By default duplicates are skipped. Check with `curl .../contacts?q=name` to verify.
