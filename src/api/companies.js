const path = require('path');
const fs = require('fs');
const { getCompanyPath, listCompanies, companyExists, ensureDir, writeNdjson, readNdjson } = require('../lib/storage');
const { createPipeline } = require('../lib/pipeline');

function listCompaniesHandler(req, res) {
  const companies = listCompanies();
  res.json({ companies, total: companies.length });
}

function getCompany(req, res) {
  const { companyId } = req.params;
  if (!companyExists(companyId)) return res.status(404).json({ error: 'Company not found' });

  const crmPath = getCompanyPath(companyId);
  const contacts = readNdjson(path.join(crmPath, 'contacts.ndjson'));
  const pipeline = readNdjson(path.join(crmPath, 'pipeline.ndjson'));

  res.json({
    id: companyId,
    contacts_count: contacts.length,
    pipeline: pipeline[0] || null,
  });
}

function createCompany(req, res) {
  const { id, name } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  if (companyExists(id)) return res.status(409).json({ error: 'Company already exists' });

  const crmPath = getCompanyPath(id);
  ensureDir(crmPath);
  ensureDir(path.join(path.resolve(process.env.CRM_STORAGE_PATH || './companies'), id, 'automations'));

  // Init empty files
  writeNdjson(path.join(crmPath, 'contacts.ndjson'), []);
  writeNdjson(path.join(crmPath, 'interactions.ndjson'), []);
  writeNdjson(path.join(crmPath, 'pipeline.ndjson'), [createPipeline(id, name)]);

  res.status(201).json({ id, name: name || id, created: true });
}

module.exports = { listCompaniesHandler, getCompany, createCompany };
