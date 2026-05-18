import { initClient } from 'trailbase';
const client = initClient('http://localhost:4000');
async function main() {
  try {
    const result = await client.records('contacts').list({ order: ['-created_at'] });
    console.log('SUCCESS:', JSON.stringify(result).slice(0, 200));
  } catch (e) {
    console.error('ERROR:', e.message);
    if (e.cause) console.error('CAUSE:', e.cause);
  }
}
main();
