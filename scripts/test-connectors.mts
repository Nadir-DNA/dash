/**
 * Test all 5 connectors directly.
 * Usage: npx tsx scripts/test-connectors.mts
 */
import { fetchAmensMetrics, checkAmensHealth } from '../lib/metrics/connectors/amens';
import { fetchDashCrmMetrics, checkDashCrmHealth } from '../lib/metrics/connectors/crm';
import { fetchLeaguePlayMetrics, checkLeaguePlayHealth } from '../lib/metrics/connectors/leagueplay';
import { fetchSiteVitrineMetrics, checkSiteVitrineHealth } from '../lib/metrics/connectors/sitevitrine';
import { fetchFlashCertMetrics, checkFlashCertHealth } from '../lib/metrics/connectors/flashcert';
import { getAllMetrics, getProjectMetrics, checkAllHealth } from '../lib/metrics/aggregator';
import type { ProjectName } from '../lib/metrics/types';

async function testConnector(name: string, fetchFn: () => any, healthFn: () => any) {
  console.log(`\n=== ${name} ===`);

  // Health check
  try {
    const health = await healthFn();
    console.log(`  Health: ${health.ok ? '✓ OK' : '✗ FAIL'} (${health.latencyMs}ms)${health.error ? ` — ${health.error}` : ''}`);
  } catch (e: any) {
    console.log(`  Health: ✗ CRASHED — ${e?.message || e}`);
  }

  // Metrics fetch
  try {
    const metrics = await fetchFn();
    console.log(`  Metrics: ✓ ${metrics.metrics.length} metrics returned`);
    for (const m of metrics.metrics) {
      console.log(`    ${m.key} = ${m.value} ${m.unit} (target: ${m.target}) — ${m.description}`);
    }
  } catch (e: any) {
    console.log(`  Metrics: ✗ CRASHED — ${e?.message || e}`);
  }
}

async function main() {
  console.log('=== Dash Metrics - Connector Integration Tests ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Individual connector tests
  await testConnector('AMENS (Supabase)', fetchAmensMetrics, checkAmensHealth);
  await testConnector('FLASHCERT (Trailbase)', fetchFlashCertMetrics, checkFlashCertHealth);
  await testConnector('CRM (Trailbase)', fetchDashCrmMetrics, checkDashCrmHealth);
  await testConnector('LEAGUEPLAY (Trailbase)', fetchLeaguePlayMetrics, checkLeaguePlayHealth);
  await testConnector('SITEVITRINE (Trailbase)', fetchSiteVitrineMetrics, checkSiteVitrineHealth);

  // Aggregator tests
  console.log(`\n=== Aggregator: getAllMetrics ===`);
  try {
    const all = await getAllMetrics();
    console.log(`  Projects: ${all.projects.length}/${all.summary.totalProjects}`);
    console.log(`  Healthy: ${all.summary.healthyProjects}`);
    console.log(`  Total metrics: ${all.summary.totalMetrics}`);
    for (const p of all.projects) {
      console.log(`  ${p.project}: ${p.metrics.length} metrics`);
    }
  } catch (e: any) {
    console.log(`  ✗ CRASHED: ${e?.message || e}`);
  }

  console.log(`\n=== Aggregator: checkAllHealth ===`);
  try {
    const healthResults = await checkAllHealth();
    for (const h of healthResults) {
      console.log(`  ${h.project}: ${h.ok ? '✓' : '✗'} (${h.latencyMs}ms)${h.error ? ` — ${h.error}` : ''}`);
    }
  } catch (e: any) {
    console.log(`  ✗ CRASHED: ${e?.message || e}`);
  }

  console.log(`\n=== Individual getProjectMetrics ===`);
  for (const project of ['crm', 'leagueplay', 'sitevitrine', 'amens', 'flashcert'] as ProjectName[]) {
    try {
      const result = await getProjectMetrics(project);
      if (result) {
        console.log(`  ${project}: ✓ ${result.metrics.length} metrics`);
      } else {
        console.log(`  ${project}: ✗ null returned (unknown project)`);
      }
    } catch (e: any) {
      console.log(`  ${project}: ✗ CRASHED — ${e?.message || e}`);
    }
  }

  console.log(`\n=== ALL TESTS COMPLETE ===`);
}

main().catch(console.error);
