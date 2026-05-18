import { initClient } from 'trailbase';
const client = initClient('http://localhost:4000');
async function testEndpoints() {
  const tests = [
    ['GET', '/api/records/contacts'],
    ['POST', '/api/records/contacts'],
    ['GET', '/api/records/contacts/list'],
    ['POST', '/api/records/contacts/list'],
    ['GET', '/api/tables/contacts'],
    ['POST', '/api/tables/contacts'],
  ];
  for (const [method, url] of tests) {
    try {
      const r = await fetch('http://localhost:4000' + url, { method });
      console.log(`${method} ${url} => ${r.status} ${r.statusText}`);
      if (r.status !== 404) {
        const text = await r.text();
        console.log('  body:', text.slice(0, 200));
      }
    } catch (e) {
      console.log(`${method} ${url} => ERROR: ${e.message}`);
    }
  }
}
testEndpoints();
