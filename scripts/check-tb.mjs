import { initClient } from 'trailbase';
const client = initClient('http://localhost:4000');
const records = client.records('contacts');
console.log('prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(records)));
