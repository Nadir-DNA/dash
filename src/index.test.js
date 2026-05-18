process.env.CRM_STORAGE_PATH = '/tmp/agentcrm-test-' + Date.now();
process.env.PORT = '3099';

const request = require('supertest');
const app = require('./index');

describe('AgentCRM API', () => {
  describe('GET /api/health', () => {
    it('returns status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.version).toBe('1.0.0');
      expect(typeof res.body.timestamp).toBe('string');
    });
  });

  describe('Companies', () => {
    it('GET /api/companies returns empty list initially', async () => {
      const res = await request(app).get('/api/companies');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.companies)).toBe(true);
    });

    it('POST /api/companies creates a company', async () => {
      const res = await request(app)
        .post('/api/companies')
        .send({ id: 'testco', name: 'Test Company' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('testco');
      expect(res.body.created).toBe(true);
    });

    it('POST /api/companies returns 409 for duplicate', async () => {
      const res = await request(app)
        .post('/api/companies')
        .send({ id: 'testco' });
      expect(res.status).toBe(409);
    });

    it('GET /api/companies/:id returns company info', async () => {
      const res = await request(app).get('/api/companies/testco');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('testco');
      expect(res.body.pipeline).not.toBeNull();
      expect(res.body.pipeline.stages).toHaveLength(7);
    });

    it('GET /api/companies/:id returns 404 for unknown', async () => {
      const res = await request(app).get('/api/companies/doesnotexist');
      expect(res.status).toBe(404);
    });
  });

  describe('Contacts', () => {
    beforeAll(async () => {
      await request(app).post('/api/companies').send({ id: 'contacts-test' });
    });

    it('GET /api/companies/:id/contacts returns empty list', async () => {
      const res = await request(app).get('/api/companies/contacts-test/contacts');
      expect(res.status).toBe(200);
      expect(res.body.contacts).toEqual([]);
    });

    it('POST creates a contact', async () => {
      const res = await request(app)
        .post('/api/companies/contacts-test/contacts')
        .send({ basic: { name: 'Jean Dupont', email: 'jean@test.fr' } });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('c0001');
      expect(res.body.stage.stage_id).toBe('new');
    });

    it('PUT /stage moves contact to a new stage', async () => {
      const res = await request(app)
        .put('/api/companies/contacts-test/contacts/c0001/stage')
        .send({ stage_id: 'contacted' });
      expect(res.status).toBe(200);
      expect(res.body.stage.stage_id).toBe('contacted');
    });

    it('PUT updates contact fields', async () => {
      const res = await request(app)
        .put('/api/companies/contacts-test/contacts/c0001')
        .send({ basic: { name: 'Jean Dupont Updated', email: 'jean@test.fr' } });
      expect(res.status).toBe(200);
      expect(res.body.basic.name).toBe('Jean Dupont Updated');
    });

    it('DELETE removes contact', async () => {
      const res = await request(app)
        .delete('/api/companies/contacts-test/contacts/c0001');
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe('c0001');
    });
  });

  describe('Pipeline', () => {
    it('pipeline has 7 required stages', async () => {
      await request(app).post('/api/companies').send({ id: 'pipeline-test' });
      const res = await request(app).get('/api/companies/pipeline-test');
      const stages = res.body.pipeline.stages.map(s => s.id);
      expect(stages).toEqual([
        'new', 'contacted', 'interested', 'demo', 'negotiation', 'closed_won', 'closed_lost'
      ]);
    });
  });
});
