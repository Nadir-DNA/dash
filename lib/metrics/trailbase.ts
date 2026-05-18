/**
 * Metrics Trailbase Client
 * Client partagé pour interroger Trailbase local (métriques agrégées).
 * Distinct du client CRM dans lib/trailbase/.
 */

import { initClient } from 'trailbase';
import type { Client } from 'trailbase';

const TRAILBASE_URL = process.env.TRAILBASE_URL || 'http://localhost:4000';
const TRAILBASE_EMAIL = process.env.TRAILBASE_EMAIL || '';
const TRAILBASE_PASSWORD = process.env.TRAILBASE_PASSWORD || '';

let _client: Client | null = null;
let _ready = false;

export function getClient(): Client {
  if (!_client) {
    _client = initClient(TRAILBASE_URL);
  }
  return _client;
}

export async function authenticate(): Promise<void> {
  if (_ready) return;
  if (!TRAILBASE_EMAIL || !TRAILBASE_PASSWORD) {
    console.warn('[Metrics/Trailbase] Credentials not set. Set TRAILBASE_EMAIL and TRAILBASE_PASSWORD in .env.local');
    return;
  }
  try {
    const client = getClient();
    await client.login(TRAILBASE_EMAIL, TRAILBASE_PASSWORD);
    _ready = true;
    console.log('[Metrics/Trailbase] Authenticated as', TRAILBASE_EMAIL);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Metrics/Trailbase] Auth failed:', msg);
  }
}

export type Filter = {
  column: string;
  value: string;
  op?: string;
};

export async function countRecords(
  table: string,
  filters?: Filter | Filter[]
): Promise<number> {
  try {
    const client = getClient();
    const opts: Record<string, unknown> = { count: true, pagination: { limit: 1 } };

    if (filters) {
      const filterArray = Array.isArray(filters) ? filters : [filters];
      if (filterArray.length === 1) {
        const f = filterArray[0]!;
        opts.filters = [{
          column: f.column,
          op: f.op || (f.column === 'created_at' ? 'greaterThanEqual' : 'equal'),
          value: f.value,
        }];
      } else {
        opts.filters = [{
          and: filterArray.map(f => ({
            column: f.column,
            op: f.op || (f.column === 'created_at' ? 'greaterThanEqual' : 'equal'),
            value: f.value,
          })),
        }];
      }
    }

    const result = await client.records(table).list(opts as Parameters<ReturnType<Client['records']>['list']>[0]);
    return (result as { total_count?: number }).total_count ?? 0;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Metrics/Trailbase] count ${table} error:`, msg);
    return 0;
  }
}

export async function fetchAllRecords(table: string, limit = 1024): Promise<Record<string, unknown>[]> {
  try {
    const client = getClient();
    const result = await client.records(table).list({ pagination: { limit } });
    return (result as { records: Record<string, unknown>[] }).records;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Metrics/Trailbase] fetch ${table} error:`, msg);
    return [];
  }
}

export async function checkHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const client = getClient();
    await client.records('dash_project_config').list({ pagination: { limit: 1 } });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, latencyMs: Date.now() - start, error: msg };
  }
}
