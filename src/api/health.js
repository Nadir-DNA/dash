const { listCompanies } = require('../lib/storage');

function healthHandler(req, res) {
  const companies = listCompanies();
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    companies: companies.length,
    storage: process.env.CRM_STORAGE_PATH || './companies',
  });
}

module.exports = { healthHandler };
