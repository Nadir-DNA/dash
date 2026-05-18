const path = require('path');
const { getCompanyPath, readNdjson, appendNdjson, writeNdjson, companyExists } = require('../lib/storage');

function getContactsFile(companyId) {
  return path.join(getCompanyPath(companyId), 'contacts.ndjson');
}

function listContacts(req, res) {
  const { companyId } = req.params;
  if (!companyExists(companyId)) return res.status(404).json({ error: 'Company not found' });

  const contacts = readNdjson(getContactsFile(companyId));
  const { stage, tag, q } = req.query;

  let filtered = contacts;
  if (stage) filtered = filtered.filter(c => c.stage?.stage_id === stage);
  if (tag) filtered = filtered.filter(c => c.tags?.includes(tag));
  if (q) {
    const term = q.toLowerCase();
    filtered = filtered.filter(c =>
      c.basic?.name?.toLowerCase().includes(term) ||
      c.basic?.email?.toLowerCase().includes(term) ||
      c.basic?.company?.toLowerCase().includes(term)
    );
  }

  res.json({ contacts: filtered, total: filtered.length });
}

function getContact(req, res) {
  const { companyId, contactId } = req.params;
  if (!companyExists(companyId)) return res.status(404).json({ error: 'Company not found' });

  const contacts = readNdjson(getContactsFile(companyId));
  const contact = contacts.find(c => c.id === contactId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
}

function createContact(req, res) {
  const { companyId } = req.params;
  if (!companyExists(companyId)) return res.status(404).json({ error: 'Company not found' });

  const body = req.body;
  if (!body.basic?.name && !body.basic?.email) {
    return res.status(400).json({ error: 'name or email required' });
  }

  const contacts = readNdjson(getContactsFile(companyId));
  const contact = {
    id: `c${String(contacts.length + 1).padStart(4, '0')}`,
    company_id: companyId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stage: { stage_id: 'new', entered_at: new Date().toISOString() },
    tags: [],
    ...body,
  };

  appendNdjson(getContactsFile(companyId), contact);
  res.status(201).json(contact);
}

function updateContact(req, res) {
  const { companyId, contactId } = req.params;
  if (!companyExists(companyId)) return res.status(404).json({ error: 'Company not found' });

  const contacts = readNdjson(getContactsFile(companyId));
  const idx = contacts.findIndex(c => c.id === contactId);
  if (idx === -1) return res.status(404).json({ error: 'Contact not found' });

  contacts[idx] = { ...contacts[idx], ...req.body, updated_at: new Date().toISOString() };
  writeNdjson(getContactsFile(companyId), contacts);
  res.json(contacts[idx]);
}

function deleteContact(req, res) {
  const { companyId, contactId } = req.params;
  if (!companyExists(companyId)) return res.status(404).json({ error: 'Company not found' });

  const contacts = readNdjson(getContactsFile(companyId));
  const filtered = contacts.filter(c => c.id !== contactId);
  if (filtered.length === contacts.length) return res.status(404).json({ error: 'Contact not found' });

  writeNdjson(getContactsFile(companyId), filtered);
  res.json({ deleted: contactId });
}

function moveStage(req, res) {
  const { companyId, contactId } = req.params;
  const { stage_id } = req.body;
  if (!stage_id) return res.status(400).json({ error: 'stage_id required' });
  if (!companyExists(companyId)) return res.status(404).json({ error: 'Company not found' });

  const contacts = readNdjson(getContactsFile(companyId));
  const idx = contacts.findIndex(c => c.id === contactId);
  if (idx === -1) return res.status(404).json({ error: 'Contact not found' });

  contacts[idx].stage = { stage_id, entered_at: new Date().toISOString() };
  contacts[idx].updated_at = new Date().toISOString();
  writeNdjson(getContactsFile(companyId), contacts);
  res.json(contacts[idx]);
}

module.exports = { listContacts, getContact, createContact, updateContact, deleteContact, moveStage };
