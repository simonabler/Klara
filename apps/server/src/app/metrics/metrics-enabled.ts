/**
 * Ist das Metrics-Modul (Metriken + Anomaly-Guard) aktiv?
 *
 * Nur mit `METRICS_ENABLED=true` und nur mit Postgres: Die Metrics-Entities
 * nutzen `jsonb`/`timestamptz`, die der SQLite-Fallback nicht unterstützt.
 * Die Tabellen legt die Migration `InitialSchema` an.
 */
export function isMetricsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const enabled = env.METRICS_ENABLED === 'true' || env.METRICS_ENABLED === '1';
  const usesPostgres = Boolean(env.TYPEORM_URL || env.TYPEORM_HOST);
  return enabled && usesPostgres;
}
