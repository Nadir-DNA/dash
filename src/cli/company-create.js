#!/usr/bin/env node
require('dotenv').config();
const { createCompany } = require('../api/companies');

const args = process.argv.slice(2);
const nameArg = args.find(a => a.startsWith('--name='));
const id = nameArg ? nameArg.split('=')[1] : args[0];

if (!id) {
  console.error('Usage: node company-create.js --name=mycompany');
  process.exit(1);
}

// Simulate req/res for CLI use
const req = { body: { id, name: id } };
const res = {
  status(code) { this._code = code; return this; },
  json(data) {
    if (this._code >= 400) {
      console.error('Error:', data.error);
      process.exit(1);
    }
    console.log(`✅ Company "${id}" created successfully`);
    console.log(JSON.stringify(data, null, 2));
  }
};

createCompany(req, res);
