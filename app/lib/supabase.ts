import { initClient } from 'trailbase';

let client: ReturnType<typeof initClient> | null = null;

function getClient() {
  if (client) return client;

  const url = process.env.TRAILBASE_URL;
  if (!url) {
    throw new Error('Missing TRAILBASE_URL');
  }

  client = initClient(url);
  return client;
}

export function getSupabase() {
  return getClient();
}

// Helper to get company ID by name
export async function getCompanyIdByName(companyName: string): Promise<string | null> {
  const res = await getClient()
    .records('companies')
    .list({ filters: [{ column: 'name', op: 'equal', value: companyName }] });

  if (!res.records || res.records.length === 0) return null;
  return res.records[0].id as string;
}

// Helper to get all companies
export async function getCompanies() {
  const res = await getClient()
    .records('companies')
    .list({ order: ['name'] });

  return res.records || [];
}

// Helper to get contacts by company
export async function getContactsByCompany(companyId: string) {
  const res = await getClient()
    .records('contacts')
    .list({
      filters: [{ column: 'company_id', op: 'equal', value: companyId }],
      order: ['-created_at'],
    });

  return res.records || [];
}

// Helper to create a contact
export async function createContact(companyId: string, contact: any) {
  const id = await getClient()
    .records('contacts')
    .create({
      company_id: companyId,
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      title: contact.title || '',
      stage: contact.stage || 'new',
      tags: contact.tags || [],
    });

  const record = await getClient().records('contacts').read(id);
  return record;
}
