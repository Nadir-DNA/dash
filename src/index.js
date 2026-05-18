require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

const { healthHandler } = require('./api/health');
const { listCompaniesHandler, getCompany, createCompany } = require('./api/companies');
const {
  listContacts, getContact, createContact, updateContact, deleteContact, moveStage
} = require('./api/contacts');

// Health
app.get('/api/health', healthHandler);

// Companies
app.get('/api/companies', listCompaniesHandler);
app.post('/api/companies', createCompany);
app.get('/api/companies/:companyId', getCompany);

// Contacts
app.get('/api/companies/:companyId/contacts', listContacts);
app.post('/api/companies/:companyId/contacts', createContact);
app.get('/api/companies/:companyId/contacts/:contactId', getContact);
app.put('/api/companies/:companyId/contacts/:contactId', updateContact);
app.delete('/api/companies/:companyId/contacts/:contactId', deleteContact);
app.put('/api/companies/:companyId/contacts/:contactId/stage', moveStage);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`AgentCRM running on http://localhost:${PORT}`);
  });
}

module.exports = app;
