/**
 * Connecteur LeaguePlay - Trailbase
 * Métriques depuis les tables leagueplay_* dans TrailBase.
 * Dégrade gracieusement si les tables n'existent pas.
 */

import { countRecords } from '../trailbase';
import type { Metric, ProjectMetricsPayload } from '../types';

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function metric(key: string, value: number, target: number, unit: string, change: number, description: string): Metric {
  return { key, value, target, unit, change, description };
}

async function getPlayersMetrics(): Promise<Metric[]> {
  const [total, thisMonth] = await Promise.all([
    countRecords('leagueplay_players'),
    countRecords('leagueplay_players', { column: 'created_at', value: startOfMonth() }),
  ]);
  return [
    metric('players_total', total, 1000, 'count', 0, 'Joueurs inscrits'),
    metric('players_this_month', thisMonth, 50, 'count', 0, 'Nouveaux joueurs ce mois'),
  ];
}

async function getGamesMetrics(): Promise<Metric[]> {
  const [total, thisMonth] = await Promise.all([
    countRecords('leagueplay_games'),
    countRecords('leagueplay_games', { column: 'created_at', value: startOfMonth() }),
  ]);
  return [
    metric('games_total', total, 500, 'count', 0, 'Matchs joués'),
    metric('games_this_month', thisMonth, 50, 'count', 0, 'Matchs ce mois'),
  ];
}

async function getTeamsMetrics(): Promise<Metric[]> {
  const total = await countRecords('leagueplay_teams');
  return [metric('teams_total', total, 100, 'count', 0, 'Équipes créées')];
}

export async function fetchLeaguePlayMetrics(): Promise<ProjectMetricsPayload> {
  const timestamp = new Date().toISOString();
  try {
    const [players, games, teams] = await Promise.allSettled([
      getPlayersMetrics(),
      getGamesMetrics(),
      getTeamsMetrics(),
    ]);
    const metrics: Metric[] = [];
    if (players.status === 'fulfilled') metrics.push(...players.value);
    else console.error('[LeaguePlay] Players error:', players.reason);
    if (games.status === 'fulfilled') metrics.push(...games.value);
    else console.error('[LeaguePlay] Games error:', games.reason);
    if (teams.status === 'fulfilled') metrics.push(...teams.value);
    else console.error('[LeaguePlay] Teams error:', teams.reason);

    if (metrics.length === 0) {
      metrics.push(metric('_status', 0, 1, 'count', 0, 'Tables Trailbase non trouvées'));
    }
    return { project: 'leagueplay', timestamp, metrics };
  } catch (err) {
    console.error('[LeaguePlay] Fatal error:', err);
    return {
      project: 'leagueplay', timestamp,
      metrics: [metric('connection_error', 0, 1, 'count', 0, 'Erreur de connexion')],
    };
  }
}

export async function checkLeaguePlayHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await countRecords('leagueplay_players');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, latencyMs: Date.now() - start, error: msg };
  }
}
