const fs = require('fs');
const path = require('path');

const CRM_STORAGE_PATH = process.env.CRM_STORAGE_PATH || './companies';

function getCompanyPath(companyId) {
  return path.resolve(CRM_STORAGE_PATH, companyId, 'crm');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
  return lines.map(line => JSON.parse(line));
}

function appendNdjson(filePath, record) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(record) + '\n');
}

function writeNdjson(filePath, records) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, records.map(r => JSON.stringify(r)).join('\n') + (records.length ? '\n' : ''));
}

function listCompanies() {
  const base = path.resolve(CRM_STORAGE_PATH);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter(name => {
    return fs.statSync(path.join(base, name)).isDirectory();
  });
}

function companyExists(companyId) {
  return fs.existsSync(getCompanyPath(companyId));
}

module.exports = {
  CRM_STORAGE_PATH,
  getCompanyPath,
  ensureDir,
  readNdjson,
  appendNdjson,
  writeNdjson,
  listCompanies,
  companyExists,
};
